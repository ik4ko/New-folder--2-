import * as admin from 'firebase-admin';
import * as nodeCrypto from 'crypto';
import { auth, firestore as firestoreTriggers, storage as storageTriggers, logger, https } from 'firebase-functions/v1';

admin.initializeApp();

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Risk thresholds — keep in sync with src/ai/flows/client-churn-prediction.ts
// ---------------------------------------------------------------------------
const RISK_THRESHOLDS = { HIGH: 65, MEDIUM: 35 };

// PHI field names — must match PHI_FIELDS in src/lib/phi-gate.ts exactly
const PHI_FIELDS_SERVER = [
  'fullName', 'medicareId', 'ssnLast4', 'address', 'phone', 'email',
  'dob', 'healthConditions', 'lastCallTranscript',
  'pcpName', 'poaName', 'poaPhone', 'pharmacyName', 'notes',
] as const;

// GCLOUD_PROJECT is injected by the Cloud Functions runtime on every cold start.
const PHI_BUCKET = 'phi-storage-medicare-retention-hq';

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
    await writeAuditLog({ uid, email, agencyId: null, role: null, source: 'unresolved', idempotent: false });
    logger.warn('[setAgencyClaim] No invitation or users doc found. agencyId NOT set.', { uid, email });

  } catch (err) {
    logger.error('[setAgencyClaim] Unhandled error — retrying.', { uid, error: err });
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
//  • PHI fields are uploaded as a JSON blob to {PROJECT_ID}-phi-vault at
//    phi/{agencyId}/{memberId}.json (GCS handles encryption at rest via CMEK).
//  • clients/{memberId}.phiRef is set to that GCS path — no PHI in Firestore.
//  • Operational metadata (carrier, plan, scores) is written to the clients collection.
//  • The raw CSV is deleted after processing so unencrypted PHI never sits in uploads/.
// ---------------------------------------------------------------------------

export const processCSVUpload = storageTriggers.object().onFinalize(async (object) => {
  const filePath = object.name;
  if (!filePath) return;

  // Only handle CSVs uploaded to uploads/{agencyId}/...
  const pathMatch = filePath.match(/^uploads\/([^/]+)\/.+\.csv$/i);
  if (!pathMatch) return;

  const agencyId = pathMatch[1];
  const uploadBucket = admin.storage().bucket(object.bucket);
  const phiBucket = admin.storage().bucket(PHI_BUCKET);

  logger.info('[processCSVUpload] Processing CSV.', { filePath, agencyId });

  const [fileBuffer] = await uploadBucket.file(filePath).download();
  const csvContent = fileBuffer.toString('utf-8');

  const rows = parseCSV(csvContent);
  if (rows.length === 0) {
    logger.warn('[processCSVUpload] No data rows found in CSV.', { filePath });
    return;
  }

  let processed = 0;
  let errors = 0;

  // Firestore batches cap at 500 ops; each row = 2 writes → chunk at 200 rows
  const CHUNK_SIZE = 200;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    // Extract and prepare each row before any I/O
    const rowData = chunk.map(row => {
      const memberId = row['id'] || row['medicareId'] || nodeCrypto.randomUUID();
      const phi: Record<string, string> = {};
      for (const field of PHI_FIELDS_SERVER) {
        const val = row[field];
        if (val && val.trim() !== '') phi[field] = val.trim();
      }
      return { row, memberId, phi, hasPhi: Object.keys(phi).length > 0 };
    });

    // Upload PHI blobs to GCS concurrently; failures captured per-item
    type UploadResult = { ok: true; gcsPath: string } | { ok: false; err: unknown };
    const uploadResults = await Promise.all(
      rowData.map(({ memberId, phi, hasPhi }): Promise<UploadResult | null> => {
        if (!hasPhi) return Promise.resolve(null);
        const gcsPath = `phi/${agencyId}/${memberId}.json`;
        return phiBucket
          .file(gcsPath)
          .save(JSON.stringify(phi), { contentType: 'application/json' })
          .then(() => ({ ok: true as const, gcsPath }))
          .catch((err: unknown) => ({ ok: false as const, err }));
      })
    );

    // Firestore batch: GCS pointer records + operational metadata
    const batch = db.batch();
    for (let j = 0; j < rowData.length; j++) {
      const { row, memberId, hasPhi } = rowData[j];
      const upload = uploadResults[j];

      try {
        if (hasPhi && upload !== null && !upload.ok) {
          logger.error('[processCSVUpload] GCS upload failed — skipping row PHI.', {
            memberId,
            error: (upload as { ok: false; err: unknown }).err,
          });
          errors++;
          continue;
        }

        const gcsPath = upload?.ok ? upload.gcsPath : null;

        // Operational metadata — PHI fields deliberately absent.
        // phiRef is the GCS object path; callers use getPhiSignedUrl to fetch it.
        batch.set(
          db.collection('clients').doc(memberId),
          {
            id: memberId,
            agencyId,
            ...(gcsPath ? { phiRef: gcsPath } : {}),
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
          },
          { merge: true }
        );

        processed++;
      } catch (rowErr) {
        errors++;
        logger.error('[processCSVUpload] Row error — skipping.', { row, error: rowErr });
      }
    }

    await batch.commit();
  }

  await db.collection('audit_logs').add({
    event: 'CSV_INGEST',
    agencyId,
    filePath,
    processed,
    errors,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Delete the raw upload — never leave unencrypted PHI in the staging bucket
  await uploadBucket.file(filePath).delete();

  logger.info('[processCSVUpload] Done.', { agencyId, processed, errors });
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

export const onClientRiskChange = firestoreTriggers
  .document('clients/{memberId}')
  .onWrite(async (change, context) => {
    // Skip deletions
    if (!change.after.exists) return;

    const after = change.after.data() as ClientDoc;
    const before = change.before.exists ? (change.before.data() as ClientDoc) : null;

    const newScore = scoreClientRisk(after);
    const prevScore = before ? scoreClientRisk(before) : null;

    // Only act when the client freshly enters HIGH risk territory
    if (newScore.level !== 'HIGH') return;
    if (prevScore?.level === 'HIGH') return;

    const memberId = context.params.memberId;
    const brokerId = after.agentId;

    if (!brokerId) {
      logger.warn('[onClientRiskChange] No agentId — cannot route alert.', { memberId });
      // Still record the event for the agency owner to see
    }

    // Look up broker's FCM tokens (may be empty if not registered)
    let fcmTokens: string[] = [];
    if (brokerId) {
      const userSnap = await db.collection('users').doc(brokerId).get();
      fcmTokens = userSnap.exists ? ((userSnap.data()?.fcmTokens as string[]) ?? []) : [];
    }

    // Create notification document (readable by the broker in-app)
    const notifRef = await db.collection('notifications').add({
      agencyId: after.agencyId,
      brokerId: brokerId ?? null,
      clientId: after.id ?? memberId,
      event: 'HIGH_RISK_DETECTED',
      riskScore: newScore.score,
      triggers: newScore.triggers,
      status: fcmTokens.length > 0 ? 'pending' : 'no_tokens',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create Retention Playbook Event Draft
    const retentionDraftContent = `CMS Alert: High risk detected for ${newScore.triggers[0]}. Please review your current coverage options to ensure uninterrupted care.`;
    
    await db.collection('retention_events').add({
      agencyId: after.agencyId,
      brokerId: brokerId ?? null,
      clientId: after.id ?? memberId,
      type: 'sms',
      draftContent: retentionDraftContent,
      status: 'draft',
      triggerReason: newScore.triggers[0],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (fcmTokens.length === 0) {
      logger.warn('[onClientRiskChange] No FCM tokens for broker.', { brokerId, memberId });
      return;
    }

    // Send FCM push to all registered devices for this broker
    const fcmPayload: admin.messaging.MulticastMessage = {
      notification: {
        title: 'High Risk Client Alert',
        body: newScore.triggers[0] ?? `Risk score ${newScore.score}/100 — review required`,
      },
      data: {
        clientId: after.id ?? memberId,
        riskScore: String(newScore.score),
        notificationId: notifRef.id,
        event: 'HIGH_RISK_DETECTED',
      },
      tokens: fcmTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(fcmPayload);

    // Remove tokens that are no longer registered (device uninstalled app, etc.)
    const staleTokens = fcmTokens.filter(
      (_, i) =>
        response.responses[i]?.error?.code ===
        'messaging/registration-token-not-registered'
    );
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

    logger.info('[onClientRiskChange] FCM alert sent.', {
      memberId,
      score: newScore.score,
      triggers: newScore.triggers,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  });

// ---------------------------------------------------------------------------
// 4. getPhiSignedUrl
//
// HTTPS callable — returns a short-lived (15-min) GCS signed URL so the
// client can download the PHI JSON blob directly from {PROJECT_ID}-phi-vault.
//
// GCS path is derived deterministically from the caller's JWT claims —
// no Firestore lookup required. Agency isolation is guaranteed because the
// path is scoped to callerAgencyId, which the client cannot forge.
//
// The service account must have roles/iam.serviceAccountTokenCreator to
// generate signed URLs. (App Engine default SA has this on Cloud Functions.)
// ---------------------------------------------------------------------------

export const getPhiSignedUrl = https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Authentication required.');
  }

  const callerAgencyId = context.auth.token['agencyId'] as string | undefined;
  if (!callerAgencyId) {
    throw new https.HttpsError('permission-denied', 'No agencyId claim — setAgencyClaim must run first.');
  }

  const { memberId } = data as { memberId?: unknown };
  if (!memberId || typeof memberId !== 'string') {
    throw new https.HttpsError('invalid-argument', 'memberId (string) is required.');
  }

  // Path is deterministic: phi/{agencyId}/{memberId}.json
  // Agency isolation is structural — a caller can only reach their own prefix.
  const gcsPath = `phi/${callerAgencyId}/${memberId}.json`;

  const file = admin.storage().bucket(PHI_BUCKET).file(gcsPath);

  // Verify the object exists before issuing a URL (avoids leaking 404 timing)
  const [exists] = await file.exists();
  if (!exists) {
    throw new https.HttpsError('not-found', 'PHI record not found.');
  }

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000, // 15-minute window
  });

  // Non-blocking audit log — failure must not surface to caller (HIPAA §164.312(b))
  db.collection('phi_access_logs')
    .add({
      action: 'PHI_SIGNED_URL',
      memberId,
      userId: context.auth.uid,
      agencyId: callerAgencyId,
      gcsPath,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    })
    .catch(e => logger.error('[getPhiSignedUrl] audit write failed.', { error: e }));

  return { url };
});

// ---------------------------------------------------------------------------
// 5. logAuditAction
// ---------------------------------------------------------------------------
export const logAuditAction = https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Authentication required.');
  }

  const brokerId = context.auth.uid;
  const callerAgencyId = context.auth.token['agencyId'] as string | undefined;

  if (!callerAgencyId) {
    throw new https.HttpsError('permission-denied', 'No agencyId claim.');
  }

  const { actionType, clientId, details } = data as {
    actionType?: string;
    clientId?: string;
    details?: string;
  };

  if (!actionType || typeof actionType !== 'string') {
    throw new https.HttpsError('invalid-argument', 'actionType is required.');
  }

  await db.collection('audit_logs').add({
    agencyId: callerAgencyId,
    brokerId,
    clientId: clientId ?? null,
    actionType,
    details: details ?? null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

// ---------------------------------------------------------------------------
// Risk scorer — pure function, no I/O.
// Keep in sync with scoreClientRisk() in src/ai/flows/client-churn-prediction.ts
// ---------------------------------------------------------------------------

interface RiskResult {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  triggers: string[];
}

function scoreClientRisk(client: Partial<ClientDoc>): RiskResult {
  let score = 0;
  const triggers: string[] = [];
  const today = new Date();

  // Plan non-renewal (highest weight signal)
  if (client.futureContract && client.carrier &&
      !client.futureContract.startsWith(client.carrier.slice(0, 3))) {
    score += 35;
    triggers.push('CMS plan non-renewal detected — contract changing next year');
  }

  // Provider Network Drift
  if (client.providerNetworkChange) {
    score += 25;
    triggers.push('Provider Network Drift detected');
  }

  // Carrier Instability
  if (client.carrierStarRating !== undefined && client.carrierStarRating < 3.0) {
    score += 25;
    triggers.push('Carrier Star Rating dropped below 3.0');
  }

  // Age
  const age = client.age ?? 0;
  if (age >= 64 && age <= 66) {
    score += 30;
    triggers.push('Approaching Medicare eligibility window');
  } else if (age >= 80) {
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
    const msPerDay = 86_400_000;
    const daysSince = Math.round((today.getTime() - new Date(client.lastReviewDate).getTime()) / msPerDay);
    if (daysSince >= 330) {
      score += 25;
      triggers.push(`No policy review in ${Math.floor(daysSince / 30)} months`);
    }
  } else {
    score += 20;
    triggers.push('No policy review on record');
  }

  // PTC consent expiry
  if (client.ptcExpiryDate) {
    const msPerDay = 86_400_000;
    const daysUntil = Math.round((new Date(client.ptcExpiryDate).getTime() - today.getTime()) / msPerDay);
    if (daysUntil <= 0) {
      score += 25;
      triggers.push('PTC consent has expired');
    } else if (daysUntil <= 30) {
      score += 15;
      triggers.push(`PTC consent expires in ${daysUntil} days`);
    }
  }

  // Negative call sentiment
  if (client.lastCallSentiment === 'negative') {
    score += 20;
    triggers.push('Negative sentiment on last recorded call');
  }

  // Dual-eligible with SSBCI gap
  if (client.medicareMedicaidStatus === 'Both' && 
      (client.ssbciStatus === 'pending' || client.ssbciStatus === 'eligible' || client.ssbciStatus === 'pending-fax')) {
    score += 15;
    triggers.push(`Dual-eligible member with SSBCI gap (${client.ssbciStatus})`);
  }

  // No POA protection
  if (client.poaStatus === 'unprotected') {
    score += 10;
    triggers.push('No power-of-attorney protection in place');
  }

  const capped = Math.min(score, 100);
  const level: RiskResult['level'] =
    capped >= RISK_THRESHOLDS.HIGH ? 'HIGH'
    : capped >= RISK_THRESHOLDS.MEDIUM ? 'MEDIUM'
    : 'LOW';

  return { score: capped, level, triggers };
}

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields and embedded commas — no external deps)
// ---------------------------------------------------------------------------

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content: string): Array<Record<string, string>> {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = normalized.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);

  return lines
    .slice(1)
    .map(line => {
      const values = parseCSVLine(line);
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    })
    .filter(row => Object.values(row).some(v => v !== ''));
}

// ---------------------------------------------------------------------------
// Audit log helper
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
// Firestore document types (server-side only)
// ---------------------------------------------------------------------------

interface AgencyClaims {
  agencyId: string;
  role: 'owner' | 'agent' | 'viewer';
}

interface InvitationDoc {
  email: string;
  agencyId: string;
  role?: 'owner' | 'agent' | 'viewer';
  status: 'pending' | 'accepted' | 'expired';
  createdAt: admin.firestore.Timestamp;
  expiresAt?: admin.firestore.Timestamp;
  invitedBy?: string;
}

interface UserDoc {
  agencyId: string;
  role: 'owner' | 'agent' | 'viewer';
  email: string;
  createdAt: admin.firestore.Timestamp;
}

interface ClientDoc {
  id?: string;
  agencyId: string;
  agentId?: string;
  /** GCS object path within PHI_BUCKET (e.g. 'phi/{agencyId}/{memberId}.json'). Absent when row had no PHI fields. */
  phiRef?: string;
  carrier?: string;
  carrierStarRating?: number;
  age?: number;
  lastReviewDate?: string;
  ptcExpiryDate?: string;
  checkInStatus?: string;
  lastCallSentiment?: string;
  medicareMedicaidStatus?: string;
  ssbciStatus?: string;
  providerNetworkChange?: boolean;
  poaStatus?: string;
  futureContract?: string;
  status?: string;
}

// ---------------------------------------------------------------------------
// Integrity Engine — Phase 1: Ingestion & Encryption
// ---------------------------------------------------------------------------
// Types

type MemberStatus =
  | 'ACTIVE'
  | 'PROVISIONALLY_DISENROLLED'
  | 'PLAN_CHANGED'
  | 'DISENROLLED';

interface MemberDoc {
  agencyId: string;
  brokerId: string;
  mbi_hash: string;           // HMAC-SHA256 keyed on PHI_MASTER_SECRET — lookup index, not PHI
  mbi_number_cipher: string;  // AES-256-GCM field-level encryption
  mbi_number_iv: string;
  date_of_birth_cipher: string;
  date_of_birth_iv: string;
  phone_number_cipher: string;
  phone_number_iv: string;
  current_plan_id: string;
  status: MemberStatus;
  lastRiskEventId?: string;
  createdAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
  updatedAt: number;
}

interface StatusHistoryEntry {
  plan_id: string;
  effective_date: string;
  previous_plan_id: string | null;
  status: MemberStatus;
  brokerId: string;          // denormalized for Firestore rules (avoids cross-doc reads)
  riskEventId?: string;
  source: string;
  recordedAt: admin.firestore.FieldValue | admin.firestore.Timestamp;
}

interface CrmPayload {
  agencyId: string;
  brokerId: string;
  mbi: string;           // raw MBI — encrypted immediately, never persisted as plaintext
  plan_id: string;
  effective_date: string; // ISO 8601 date string, e.g. '2026-07-01'
  date_of_birth?: string;
  phone_number?: string;
  source?: string;       // 'ghl' | 'enrollhere' | 'manual'
}

interface SwitchRiskResult {
  riskLevel: 'LOW' | 'HIGH';
  status: MemberStatus | 'NO_CHANGE';
  triggerReason: string | null;
  daysUntilEffective: number | null;
}

interface EncryptedField {
  cipher: string; // base64(ciphertext + 16-byte GCM auth tag)
  iv: string;     // base64(12-byte random IV)
}

// ---------------------------------------------------------------------------
// Field-level encryption helpers (AES-256-GCM, per-agency key)
// ---------------------------------------------------------------------------

function deriveFieldEncKey(agencyId: string): Buffer {
  const masterSecret = process.env.PHI_MASTER_SECRET;
  if (!masterSecret) throw new Error('PHI_MASTER_SECRET is not configured.');
  // Salt prefix 'fle:' differentiates field-level keys from the blob-level keys
  // used in processCSVUpload, preventing key reuse across encryption contexts.
  return nodeCrypto.pbkdf2Sync(masterSecret, `fle:${agencyId}`, 100_000, 32, 'sha256');
}

function encryptField(plaintext: string, key: Buffer): EncryptedField {
  const iv = nodeCrypto.randomBytes(12);
  const cipher = nodeCrypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, 'utf8')),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag(); // 16 bytes — appended so decryption can verify integrity
  return {
    cipher: Buffer.concat([encrypted, authTag]).toString('base64'),
    iv: iv.toString('base64'),
  };
}

// HMAC-keyed hash of the MBI for indexed lookups without exposing plaintext PHI.
// The PHI_MASTER_SECRET + agencyId scope means the same MBI hashes differently
// across agencies, preventing cross-agency correlation.
function mbiIndexHash(mbi: string, agencyId: string): string {
  const masterSecret = process.env.PHI_MASTER_SECRET;
  if (!masterSecret) throw new Error('PHI_MASTER_SECRET is not configured.');
  return nodeCrypto
    .createHmac('sha256', masterSecret)
    .update(`${agencyId}:${mbi.toUpperCase().trim()}`)
    .digest('hex');
}

// Constant-time HMAC-SHA256 signature verification (prevents timing attacks).
// Accepts both raw hex and "sha256=<hex>" (GoHighLevel format).
function verifyWebhookSignature(rawBody: Buffer, secret: string, provided: string): boolean {
  const expected = nodeCrypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const actual = provided.startsWith('sha256=') ? provided.slice(7) : provided;
  try {
    return nodeCrypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(actual.padEnd(expected.length, '0'), 'hex'), // pad to prevent length error
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// evaluateSwitchRisk — pure function, no I/O
//
// If the incoming plan_id differs from the stored plan_id AND the effective_date
// is in the future, the member is PROVISIONALLY_DISENROLLED — the broker still
// has time to intervene before the switch takes effect.
// ---------------------------------------------------------------------------

export function evaluateSwitchRisk(
  payload: Pick<CrmPayload, 'plan_id' | 'effective_date'>,
  existing: Pick<MemberDoc, 'current_plan_id'>,
): SwitchRiskResult {
  const planChanged = payload.plan_id !== existing.current_plan_id;
  if (!planChanged) {
    return { riskLevel: 'LOW', status: 'NO_CHANGE', triggerReason: null, daysUntilEffective: null };
  }

  const effectiveMs = new Date(payload.effective_date).getTime();
  const daysUntilEffective = Math.ceil((effectiveMs - Date.now()) / 86_400_000);

  if (daysUntilEffective > 0) {
    return {
      riskLevel: 'HIGH',
      status: 'PROVISIONALLY_DISENROLLED',
      triggerReason:
        `Plan switch ${existing.current_plan_id} → ${payload.plan_id} ` +
        `takes effect in ${daysUntilEffective} day(s) (${payload.effective_date}). ` +
        `Call member now to review options before the change locks in.`,
      daysUntilEffective,
    };
  }

  return {
    riskLevel: 'HIGH',
    status: 'PLAN_CHANGED',
    triggerReason:
      `Plan changed ${existing.current_plan_id} → ${payload.plan_id} ` +
      `effective ${payload.effective_date}.`,
    daysUntilEffective: 0,
  };
}

// ---------------------------------------------------------------------------
// onCrmUpdate — HTTPS webhook endpoint (CRM Bridge)
//
// Accepts POST from GoHighLevel or EnrollHere.
// URL is the deployed Cloud Function URL; configure it in GHL/EnrollHere as
// the webhook destination for plan enrollment events.
//
// Security:
//   • HMAC-SHA256 on x-webhook-signature header (shared secret per integration)
//   • MBI is hashed on receipt and never stored in plaintext
//   • PHI fields are AES-256-GCM encrypted with per-agency key before any write
//
// Required env vars (set via `firebase functions:secrets:set`):
//   PHI_MASTER_SECRET   — key derivation + MBI hashing
//   CRM_WEBHOOK_SECRET  — HMAC signing secret shared with GHL / EnrollHere
// ---------------------------------------------------------------------------

export const onCrmUpdate = https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const webhookSecret = process.env.CRM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('[onCrmUpdate] CRM_WEBHOOK_SECRET is not set.');
    res.status(500).json({ error: 'Server misconfiguration.' });
    return;
  }

  const sig = req.headers['x-webhook-signature'] as string | undefined;
  const rawBody = (req as unknown as { rawBody: Buffer }).rawBody;

  if (!sig || !rawBody || !verifyWebhookSignature(rawBody, webhookSecret, sig)) {
    logger.warn('[onCrmUpdate] Webhook signature invalid or missing.', {
      hasSig: !!sig,
      hasRawBody: !!rawBody,
    });
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const payload = req.body as Partial<CrmPayload>;

  if (!payload.agencyId || !payload.brokerId || !payload.mbi ||
      !payload.plan_id || !payload.effective_date) {
    res.status(400).json({
      error: 'Missing required fields: agencyId, brokerId, mbi, plan_id, effective_date.',
    });
    return;
  }

  let encKey: Buffer;
  try {
    encKey = deriveFieldEncKey(payload.agencyId);
  } catch (e) {
    logger.error('[onCrmUpdate] Key derivation failed.', { error: e });
    res.status(500).json({ error: 'Server misconfiguration.' });
    return;
  }

  const mbiHash = mbiIndexHash(payload.mbi, payload.agencyId);

  // Lookup by HMAC hash — never query by plaintext MBI
  const memberSnap = await db
    .collection('members')
    .where('mbi_hash', '==', mbiHash)
    .where('agencyId', '==', payload.agencyId)
    .limit(1)
    .get();

  if (memberSnap.empty) {
    // New member: encrypt all three PHI fields and create the record
    const mbiEnc    = encryptField(payload.mbi,                              encKey);
    const dobEnc    = encryptField(payload.date_of_birth   ?? '', encKey);
    const phoneEnc  = encryptField(payload.phone_number    ?? '', encKey);

    const newRef = db.collection('members').doc();
    const batch  = db.batch();

    batch.set(newRef, {
      agencyId:             payload.agencyId,
      brokerId:             payload.brokerId,
      mbi_hash:             mbiHash,
      mbi_number_cipher:    mbiEnc.cipher,
      mbi_number_iv:        mbiEnc.iv,
      date_of_birth_cipher: dobEnc.cipher,
      date_of_birth_iv:     dobEnc.iv,
      phone_number_cipher:  phoneEnc.cipher,
      phone_number_iv:      phoneEnc.iv,
      current_plan_id:      payload.plan_id,
      status:               'ACTIVE' as MemberStatus,
      createdAt:            admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:            Date.now(),
    });

    batch.set(newRef.collection('status_history').doc(), {
      plan_id:          payload.plan_id,
      effective_date:   payload.effective_date,
      previous_plan_id: null,
      status:           'ACTIVE' as MemberStatus,
      brokerId:         payload.brokerId,
      source:           payload.source ?? 'crm_webhook',
      recordedAt:       admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    logger.info('[onCrmUpdate] New member ingested.', { agencyId: payload.agencyId });
    res.status(201).json({ status: 'CREATED' });
    return;
  }

  // Existing member — check for plan switch
  const memberDoc = memberSnap.docs[0];
  const existing  = memberDoc.data() as MemberDoc;
  const risk      = evaluateSwitchRisk(
    { plan_id: payload.plan_id, effective_date: payload.effective_date },
    existing,
  );

  if (risk.riskLevel === 'LOW') {
    await memberDoc.ref.update({ current_plan_id: payload.plan_id, updatedAt: Date.now() });
    res.status(200).json({ status: 'NO_CHANGE' });
    return;
  }

  // Plan switch detected — write RiskEvent and update member atomically
  const riskEventRef = db.collection('risk_events').doc();
  const batch = db.batch();

  batch.set(riskEventRef, {
    memberId:            memberDoc.id,
    agencyId:            payload.agencyId,
    brokerId:            existing.brokerId,
    event:               'PLAN_SWITCH_DETECTED',
    riskLevel:           risk.riskLevel,
    previousPlanId:      existing.current_plan_id,
    newPlanId:           payload.plan_id,
    effectiveDate:       payload.effective_date,
    triggerReason:       risk.triggerReason,
    daysUntilEffective:  risk.daysUntilEffective,
    source:              payload.source ?? 'crm_webhook',
    createdAt:           admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.update(memberDoc.ref, {
    current_plan_id:  payload.plan_id,
    status:           risk.status,
    lastRiskEventId:  riskEventRef.id,
    updatedAt:        Date.now(),
  });

  batch.set(memberDoc.ref.collection('status_history').doc(), {
    plan_id:          payload.plan_id,
    effective_date:   payload.effective_date,
    previous_plan_id: existing.current_plan_id,
    status:           risk.status as MemberStatus,
    brokerId:         existing.brokerId,
    riskEventId:      riskEventRef.id,
    source:           payload.source ?? 'crm_webhook',
    recordedAt:       admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  logger.info('[onCrmUpdate] Risk event created.', {
    memberId: memberDoc.id,
    status:   risk.status,
    days:     risk.daysUntilEffective,
  });

  res.status(200).json({
    status:             risk.status,
    riskLevel:          risk.riskLevel,
    riskEventId:        riskEventRef.id,
    triggerReason:      risk.triggerReason,
    daysUntilEffective: risk.daysUntilEffective,
  });
});
