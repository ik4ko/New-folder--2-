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
exports.onClientRiskChange = exports.processCSVUpload = exports.setAgencyClaim = void 0;
const admin = __importStar(require("firebase-admin"));
const nodeCrypto = __importStar(require("crypto"));
const v1_1 = require("firebase-functions/v1");
admin.initializeApp();
const db = admin.firestore();
// ---------------------------------------------------------------------------
// Risk thresholds — keep in sync with src/ai/flows/client-churn-prediction.ts
// ---------------------------------------------------------------------------
const RISK_THRESHOLDS = { HIGH: 65, MEDIUM: 35 };
// PHI field names — keep in sync with src/lib/phi-gate.ts PHI_FIELDS
const PHI_FIELDS_SERVER = [
    'fullName', 'medicareId', 'ssnLast4', 'address', 'phone', 'email',
    'dob', 'pcpName', 'poaName', 'poaPhone', 'pharmacyName', 'notes',
];
// ---------------------------------------------------------------------------
// 1. setAgencyClaim
//
// Fires on every new Firebase Auth user. Sets { agencyId, role } as custom
// claims so Firestore security rules can enforce agency-level PHI isolation.
//
// Lookup order:
//   1. invitations/{auto-id}  where email == user.email && status == 'pending'
//   2. users/{uid}            where agencyId is pre-populated
//
// Idempotency: re-fetches current claims before writing so retries are safe.
// ---------------------------------------------------------------------------
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
        await writeAuditLog({ uid, email, agencyId: null, role: null, source: 'unresolved', idempotent: false });
        v1_1.logger.warn('[setAgencyClaim] No invitation or users doc found. agencyId NOT set.', { uid, email });
    }
    catch (err) {
        v1_1.logger.error('[setAgencyClaim] Unhandled error — retrying.', { uid, error: err });
        throw err;
    }
});
// ---------------------------------------------------------------------------
// 2. processCSVUpload
//
// Triggers when a broker uploads a CSV to Storage at the path:
//   uploads/{agencyId}/{filename}.csv
//
// For each row:
//  • PHI fields are encrypted with AES-256-GCM (key derived from
//    PHI_MASTER_SECRET + agencyId) and written to phi_vault.
//  • Operational metadata is written to the clients collection.
//  • The raw file is deleted after successful processing.
//
// Environment variable required:
//   PHI_MASTER_SECRET — set via: firebase functions:secrets:set PHI_MASTER_SECRET
// ---------------------------------------------------------------------------
exports.processCSVUpload = v1_1.storage.object().onFinalize(async (object) => {
    const filePath = object.name;
    if (!filePath)
        return;
    // Only handle CSVs uploaded to uploads/{agencyId}/...
    const pathMatch = filePath.match(/^uploads\/([^/]+)\/.+\.csv$/i);
    if (!pathMatch)
        return;
    const agencyId = pathMatch[1];
    const bucket = admin.storage().bucket(object.bucket);
    v1_1.logger.info('[processCSVUpload] Processing CSV.', { filePath, agencyId });
    const masterSecret = process.env.PHI_MASTER_SECRET;
    if (!masterSecret) {
        v1_1.logger.error('[processCSVUpload] PHI_MASTER_SECRET env var is not set. Aborting.');
        return;
    }
    // Download file content
    const [fileBuffer] = await bucket.file(filePath).download();
    const csvContent = fileBuffer.toString('utf-8');
    const rows = parseCSV(csvContent);
    if (rows.length === 0) {
        v1_1.logger.warn('[processCSVUpload] No data rows found in CSV.', { filePath });
        return;
    }
    // Derive per-agency encryption key once (PBKDF2 is intentionally slow)
    const encKey = deriveAgencyKey(masterSecret, agencyId);
    let processed = 0;
    let errors = 0;
    // Firestore batches cap at 500 ops; each row = 2 writes → chunk at 200 rows
    const CHUNK_SIZE = 200;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const batch = db.batch();
        for (const row of chunk) {
            try {
                const memberId = row['id'] || row['medicareId'] || nodeCrypto.randomUUID();
                // ---- PHI: extract, encrypt, write to phi_vault ----
                const phi = {};
                for (const field of PHI_FIELDS_SERVER) {
                    const val = row[field];
                    if (val && val.trim() !== '')
                        phi[field] = val.trim();
                }
                if (Object.keys(phi).length > 0) {
                    const encrypted = encryptPhi(phi, encKey);
                    batch.set(db.collection('phi_vault').doc(agencyId).collection('records').doc(memberId), {
                        memberId,
                        agencyId,
                        cipher: encrypted.cipher,
                        iv: encrypted.iv,
                        hash: encrypted.hash,
                        encryptedAt: Date.now(),
                        encryptedBy: 'csv-ingest',
                    });
                }
                // ---- Operational metadata: write to clients ----
                batch.set(db.collection('clients').doc(memberId), {
                    id: memberId,
                    agencyId,
                    carrier: row['carrier'] || '',
                    planName: row['planName'] || row['plan_name'] || '',
                    enrollmentPeriod: row['enrollmentPeriod'] || row['enrollment_period'] || 'OE',
                    monthlyPremium: row['monthlyPremium'] || row['monthly_premium'] || '$0.00',
                    partAEffective: row['partAEffective'] || row['part_a_effective'] || '',
                    partBEffective: row['partBEffective'] || row['part_b_effective'] || '',
                    status: row['status'] || 'active',
                    medicareMedicaidStatus: row['medicareMedicaidStatus'] || row['medicare_medicaid_status'] || 'None',
                    ssbciStatus: row['ssbciStatus'] || 'not-needed',
                    checkInStatus: row['checkInStatus'] || 'scheduled',
                    poaStatus: row['poaStatus'] || 'unprotected',
                    soaStatus: row['soaStatus'] || '',
                    soaDate: row['soaDate'] || null,
                    retentionScore: Number(row['retentionScore']) || 100,
                    age: Number(row['age']) || 0,
                    ptcExpiryDate: row['ptcExpiryDate'] || row['ptc_expiry_date'] || '',
                    lastSync: new Date().toISOString(),
                    updatedAt: Date.now(),
                }, { merge: true });
                processed++;
            }
            catch (rowErr) {
                errors++;
                v1_1.logger.error('[processCSVUpload] Row error — skipping.', { row, error: rowErr });
            }
        }
        await batch.commit();
    }
    // Audit log
    await db.collection('audit_logs').add({
        event: 'CSV_INGEST',
        agencyId,
        filePath,
        processed,
        errors,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Delete the raw file — never leave unencrypted PHI in Storage
    await bucket.file(filePath).delete();
    v1_1.logger.info('[processCSVUpload] Done.', { agencyId, processed, errors });
});
// ---------------------------------------------------------------------------
// 3. onClientRiskChange
//
// Triggers on every write to clients/{memberId}. Runs the rule-based risk
// scorer. If the score crosses the HIGH_RISK threshold for the first time:
//   • Writes a document to the notifications collection.
//   • Sends an FCM push to each of the assigned broker's registered devices.
//   • Cleans up stale FCM tokens automatically.
// ---------------------------------------------------------------------------
exports.onClientRiskChange = v1_1.firestore
    .document('clients/{memberId}')
    .onWrite(async (change, context) => {
    var _a, _b, _c, _d, _e;
    // Skip deletions
    if (!change.after.exists)
        return;
    const after = change.after.data();
    const before = change.before.exists ? change.before.data() : null;
    const newScore = scoreClientRisk(after);
    const prevScore = before ? scoreClientRisk(before) : null;
    // Only act when the client freshly enters HIGH risk territory
    if (newScore.level !== 'HIGH')
        return;
    if ((prevScore === null || prevScore === void 0 ? void 0 : prevScore.level) === 'HIGH')
        return;
    const memberId = context.params.memberId;
    const brokerId = after.agentId;
    if (!brokerId) {
        v1_1.logger.warn('[onClientRiskChange] No agentId — cannot route alert.', { memberId });
        // Still record the event for the agency owner to see
    }
    // Look up broker's FCM tokens (may be empty if not registered)
    let fcmTokens = [];
    if (brokerId) {
        const userSnap = await db.collection('users').doc(brokerId).get();
        fcmTokens = userSnap.exists ? ((_b = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.fcmTokens) !== null && _b !== void 0 ? _b : []) : [];
    }
    // Create notification document (readable by the broker in-app)
    const notifRef = await db.collection('notifications').add({
        agencyId: after.agencyId,
        brokerId: brokerId !== null && brokerId !== void 0 ? brokerId : null,
        clientId: (_c = after.id) !== null && _c !== void 0 ? _c : memberId,
        event: 'HIGH_RISK_DETECTED',
        riskScore: newScore.score,
        triggers: newScore.triggers,
        status: fcmTokens.length > 0 ? 'pending' : 'no_tokens',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (fcmTokens.length === 0) {
        v1_1.logger.warn('[onClientRiskChange] No FCM tokens for broker.', { brokerId, memberId });
        return;
    }
    // Send FCM push to all registered devices for this broker
    const fcmPayload = {
        notification: {
            title: 'High Risk Client Alert',
            body: (_d = newScore.triggers[0]) !== null && _d !== void 0 ? _d : `Risk score ${newScore.score}/100 — review required`,
        },
        data: {
            clientId: (_e = after.id) !== null && _e !== void 0 ? _e : memberId,
            riskScore: String(newScore.score),
            notificationId: notifRef.id,
            event: 'HIGH_RISK_DETECTED',
        },
        tokens: fcmTokens,
    };
    const response = await admin.messaging().sendEachForMulticast(fcmPayload);
    // Remove tokens that are no longer registered (device uninstalled app, etc.)
    const staleTokens = fcmTokens.filter((_, i) => {
        var _a, _b;
        return ((_b = (_a = response.responses[i]) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.code) ===
            'messaging/registration-token-not-registered';
    });
    if (staleTokens.length > 0 && brokerId) {
        await db.collection('users').doc(brokerId).update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...staleTokens),
        });
    }
    await notifRef.update({
        status: response.failureCount === 0 ? 'sent' : 'partial',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        successCount: response.successCount,
        failureCount: response.failureCount,
    });
    v1_1.logger.info('[onClientRiskChange] FCM alert sent.', {
        memberId,
        score: newScore.score,
        triggers: newScore.triggers,
        successCount: response.successCount,
        failureCount: response.failureCount,
    });
});
function scoreClientRisk(client) {
    var _a;
    let score = 0;
    const triggers = [];
    const today = new Date();
    // Plan non-renewal (highest weight signal)
    if (client.futureContract && client.carrier &&
        !client.futureContract.startsWith(client.carrier.slice(0, 3))) {
        score += 35;
        triggers.push('CMS plan non-renewal detected — contract changing next year');
    }
    // Age
    const age = (_a = client.age) !== null && _a !== void 0 ? _a : 0;
    if (age >= 64 && age <= 66) {
        score += 30;
        triggers.push('Approaching Medicare eligibility window');
    }
    else if (age >= 80) {
        score += 20;
        triggers.push('Age 80+ — elevated care coordination needs');
    }
    // Escalated check-in
    if (client.checkInStatus === 'escalated') {
        score += 25;
        triggers.push('Active escalation flag on check-in');
    }
    // Overdue review
    if (client.lastReviewDate) {
        const msPerDay = 86400000;
        const daysSince = Math.round((today.getTime() - new Date(client.lastReviewDate).getTime()) / msPerDay);
        if (daysSince >= 330) {
            score += 25;
            triggers.push(`No policy review in ${Math.floor(daysSince / 30)} months`);
        }
    }
    else {
        score += 20;
        triggers.push('No policy review on record');
    }
    // PTC consent expiry
    if (client.ptcExpiryDate) {
        const msPerDay = 86400000;
        const daysUntil = Math.round((new Date(client.ptcExpiryDate).getTime() - today.getTime()) / msPerDay);
        if (daysUntil <= 0) {
            score += 25;
            triggers.push('PTC consent has expired');
        }
        else if (daysUntil <= 30) {
            score += 15;
            triggers.push(`PTC consent expires in ${daysUntil} days`);
        }
    }
    // Negative call sentiment
    if (client.lastCallSentiment === 'negative') {
        score += 20;
        triggers.push('Negative sentiment on last recorded call');
    }
    // Dual-eligible with pending SSBCI
    if (client.medicareMedicaidStatus === 'Both' && client.ssbciStatus === 'pending-fax') {
        score += 15;
        triggers.push('Dual-eligible member with pending SSBCI application');
    }
    // No POA protection
    if (client.poaStatus === 'unprotected') {
        score += 10;
        triggers.push('No power-of-attorney protection in place');
    }
    const capped = Math.min(score, 100);
    const level = capped >= RISK_THRESHOLDS.HIGH ? 'HIGH'
        : capped >= RISK_THRESHOLDS.MEDIUM ? 'MEDIUM'
            : 'LOW';
    return { score: capped, level, triggers };
}
// ---------------------------------------------------------------------------
// AES-256-GCM encryption helpers (server-side only)
// ---------------------------------------------------------------------------
function deriveAgencyKey(masterSecret, agencyId) {
    // 100k PBKDF2 iterations — intentionally slow to resist brute-force
    return nodeCrypto.pbkdf2Sync(masterSecret, agencyId, 100000, 32, 'sha256');
}
function encryptPhi(data, key) {
    const iv = nodeCrypto.randomBytes(12);
    const cipherObj = nodeCrypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(data));
    const encrypted = Buffer.concat([cipherObj.update(plaintext), cipherObj.final()]);
    const authTag = cipherObj.getAuthTag();
    // Append auth tag to ciphertext so decryption can verify integrity
    const cipherWithTag = Buffer.concat([encrypted, authTag]);
    const hash = nodeCrypto.createHash('sha256').update(cipherWithTag).digest('base64');
    return {
        cipher: cipherWithTag.toString('base64'),
        iv: iv.toString('base64'),
        hash,
    };
}
// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields and embedded commas — no external deps)
// ---------------------------------------------------------------------------
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            }
            else {
                inQuotes = !inQuotes;
            }
        }
        else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        }
        else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}
function parseCSV(content) {
    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const lines = normalized.split('\n');
    if (lines.length < 2)
        return [];
    const headers = parseCSVLine(lines[0]);
    return lines
        .slice(1)
        .map(line => {
        const values = parseCSVLine(line);
        return Object.fromEntries(headers.map((h, i) => { var _a; return [h, (_a = values[i]) !== null && _a !== void 0 ? _a : '']; }));
    })
        .filter(row => Object.values(row).some(v => v !== ''));
}
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