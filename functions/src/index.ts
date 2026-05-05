import * as admin from 'firebase-admin';
import { auth, logger } from 'firebase-functions/v1';

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
export const setAgencyClaim = auth.user().onCreate(async (user) => {
  const { uid, email } = user;

  if (!email) {
    logger.warn('[setAgencyClaim] User has no email — skipping claim assignment.', { uid });
    await writeAuditLog({ uid, email: null, agencyId: null, role: null, source: 'no_email', idempotent: false });
    return;
  }

  try {
    // Idempotency guard: on a Cloud Functions retry the user already exists in
    // Auth. Re-fetch their current claims so we can skip the write if the
    // correct claims are already in place (prevents double-accepting an invite).
    const freshUser = await admin.auth().getUser(uid);
    const existing = (freshUser.customClaims ?? {}) as Partial<AgencyClaims>;

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
      const invite = inviteDoc.data() as InvitationDoc;

      if (!invite.agencyId) {
        logger.error('[setAgencyClaim] Invitation missing agencyId field.', { uid, inviteId: inviteDoc.id });
      } else {
        const claims: AgencyClaims = {
          agencyId: invite.agencyId,
          role: invite.role ?? 'agent',
        };

        const alreadySet =
          existing.agencyId === claims.agencyId && existing.role === claims.role;

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
        logger.info('[setAgencyClaim] Claims set via invitation.', { uid, ...claims, idempotent: alreadySet });
        return;
      }
    }

    // --- 2. Pre-populated users/{uid} doc (agency owner self-registration) ---
    const userDocSnap = await db.collection('users').doc(uid).get();

    if (userDocSnap.exists) {
      const userData = userDocSnap.data() as Partial<UserDoc>;

      if (userData.agencyId) {
        const claims: AgencyClaims = {
          agencyId: userData.agencyId,
          role: userData.role ?? 'owner',
        };

        const alreadySet =
          existing.agencyId === claims.agencyId && existing.role === claims.role;

        if (!alreadySet) {
          await admin.auth().setCustomUserClaims(uid, claims);
        }

        await writeAuditLog({ uid, email, ...claims, source: 'users_doc', idempotent: alreadySet });
        logger.info('[setAgencyClaim] Claims set via users doc.', { uid, ...claims, idempotent: alreadySet });
        return;
      }
    }

    // --- 3. No agency found ---
    // User exists in Auth but has no agencyId. They cannot access phi_vault or
    // clients until an admin sets claims manually via Admin SDK.
    await writeAuditLog({ uid, email, agencyId: null, role: null, source: 'unresolved', idempotent: false });
    logger.warn('[setAgencyClaim] No invitation or users doc found. agencyId NOT set.', { uid, email });

  } catch (err) {
    logger.error('[setAgencyClaim] Unhandled error — retrying.', { uid, error: err });
    // Re-throwing causes Functions to retry the event (up to the retry limit).
    throw err;
  }
});

// ---------------------------------------------------------------------------
// Audit logging
// Uses Admin SDK — bypasses Firestore security rules by design.
// Failures are swallowed so a logging outage never blocks claim assignment.
// ---------------------------------------------------------------------------

interface AuditLogEntry {
  uid: string;
  email: string | null;
  agencyId: string | null;
  role: string | null;
  source: 'invitation' | 'users_doc' | 'unresolved' | 'no_email';
  idempotent: boolean;
}

async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db.collection('audit_logs').add({
      event: 'AGENCY_CLAIM_SET',
      ...entry,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (auditErr) {
    logger.error('[setAgencyClaim] audit_logs write failed.', { uid: entry.uid, error: auditErr });
  }
}

// ---------------------------------------------------------------------------
// Firestore document types (server-side only — not imported by the client app)
// ---------------------------------------------------------------------------

interface AgencyClaims {
  agencyId: string;
  role: 'owner' | 'agent' | 'viewer';
}

// invitations/{auto-id}
interface InvitationDoc {
  email: string;
  agencyId: string;
  role?: 'owner' | 'agent' | 'viewer';
  status: 'pending' | 'accepted' | 'expired';
  createdAt: admin.firestore.Timestamp;
  expiresAt?: admin.firestore.Timestamp;
  invitedBy?: string; // uid of the agency owner who sent the invite
}

// users/{uid}
interface UserDoc {
  agencyId: string;
  role: 'owner' | 'agent' | 'viewer';
  email: string;
  createdAt: admin.firestore.Timestamp;
}
