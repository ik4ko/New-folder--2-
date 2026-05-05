"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAgencyClaim = void 0;
const admin = __importStar(require("firebase-admin"));
const v1_1 = require("firebase-functions/v1");
admin.initializeApp();
const db = admin.firestore();
/**
 * setAgencyClaim
 *
 * Fires on every new Firebase Auth user. Sets { agencyId, role } as custom
 * claims so that Firestore security rules can enforce agency-level PHI isolation
 * without a round-trip on every read.
 *
 * Lookup order:
 *
 *   1. invitations/{auto-id}  where email == user.email && status == 'pending'
 *      Covers invited agents/brokers. Marks the invitation accepted.
 *
 *   2. users/{uid}  where agencyId is pre-populated
 *      Covers agency owners who self-register (their doc is written by an
 *      onboarding flow or admin before the account is fully created).
 *
 * If neither source yields an agencyId the claim is left unset and the user
 * has zero access to phi_vault or clients until an admin corrects it via
 * the Admin SDK.
 *
 * Idempotency: re-fetches the user's current claims from Auth before writing
 * so a Cloud Functions retry does not overwrite a correctly set claim or
 * double-accept an invitation.
 */
exports.setAgencyClaim = v1_1.auth.user().onCreate(async (user) => {
    var _a, _b, _c;
    const { uid, email } = user;
    if (!email) {
        v1_1.logger.warn('[setAgencyClaim] User has no email — skipping claim assignment.', { uid });
        await writeAuditLog({ uid, email: null, agencyId: null, role: null, source: 'no_email', idempotent: false });
        return;
    }
    try {
        // Idempotency guard: on a Cloud Functions retry the user already exists in
        // Auth. Re-fetch their current claims so we can skip the write if the
        // correct claims are already in place (prevents double-accepting an invite).
        const freshUser = await admin.auth().getUser(uid);
        const existing = ((_a = freshUser.customClaims) !== null && _a !== void 0 ? _a : {});
        // --- 1. Invitation lookup ---
        const inviteSnap = await db
            .collection('invitations')
            .where('email', '==', email)
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        if (!inviteSnap.empty) {
            const inviteDoc = inviteSnap.docs[0];
            const invite = inviteDoc.data();
            if (!invite.agencyId) {
                v1_1.logger.error('[setAgencyClaim] Invitation missing agencyId field.', { uid, inviteId: inviteDoc.id });
            }
            else {
                const claims = {
                    agencyId: invite.agencyId,
                    role: (_b = invite.role) !== null && _b !== void 0 ? _b : 'agent',
                };
                const alreadySet = existing.agencyId === claims.agencyId && existing.role === claims.role;
                if (!alreadySet) {
                    await admin.auth().setCustomUserClaims(uid, claims);
                    // Mark invitation consumed — Admin SDK bypasses Firestore rules intentionally.
                    await inviteDoc.ref.update({
                        status: 'accepted',
                        acceptedBy: uid,
                        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                await writeAuditLog({ uid, email, ...claims, source: 'invitation', idempotent: alreadySet });
                v1_1.logger.info('[setAgencyClaim] Claims set via invitation.', { uid, ...claims, idempotent: alreadySet });
                return;
            }
        }
        // --- 2. Pre-populated users/{uid} doc (agency owner self-registration) ---
        const userDocSnap = await db.collection('users').doc(uid).get();
        if (userDocSnap.exists) {
            const userData = userDocSnap.data();
            if (userData.agencyId) {
                const claims = {
                    agencyId: userData.agencyId,
                    role: (_c = userData.role) !== null && _c !== void 0 ? _c : 'owner',
                };
                const alreadySet = existing.agencyId === claims.agencyId && existing.role === claims.role;
                if (!alreadySet) {
                    await admin.auth().setCustomUserClaims(uid, claims);
                }
                await writeAuditLog({ uid, email, ...claims, source: 'users_doc', idempotent: alreadySet });
                v1_1.logger.info('[setAgencyClaim] Claims set via users doc.', { uid, ...claims, idempotent: alreadySet });
                return;
            }
        }
        // --- 3. No agency found ---
        // User exists in Auth but has no agencyId. They cannot access phi_vault or
        // clients until an admin sets claims manually via Admin SDK.
        await writeAuditLog({ uid, email, agencyId: null, role: null, source: 'unresolved', idempotent: false });
        v1_1.logger.warn('[setAgencyClaim] No invitation or users doc found. agencyId NOT set.', { uid, email });
    }
    catch (err) {
        v1_1.logger.error('[setAgencyClaim] Unhandled error — retrying.', { uid, error: err });
        // Re-throwing causes Functions to retry the event (up to the retry limit).
        throw err;
    }
});
async function writeAuditLog(entry) {
    try {
        await db.collection('audit_logs').add({
            event: 'AGENCY_CLAIM_SET',
            ...entry,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (auditErr) {
        v1_1.logger.error('[setAgencyClaim] audit_logs write failed.', { uid: entry.uid, error: auditErr });
    }
}
//# sourceMappingURL=index.js.map