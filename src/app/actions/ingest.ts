'use server'

import { adminDb, admin } from '@/lib/firebase-admin';
import crypto from 'crypto';

interface CrmPayload {
  mbi_number: string;
  plan_id: string;
  effective_date: string;
  date_of_birth?: string;
  phone_number?: string;
  source?: string;
}

// ---------------------------------------------------------------------------
// Reused Field-Level Encryption Logic (Phase 1)
// ---------------------------------------------------------------------------
function deriveFieldEncKey(agencyId: string): Buffer {
  const masterSecret = process.env.PHI_MASTER_SECRET;
  if (!masterSecret) throw new Error('PHI_MASTER_SECRET is not configured.');
  return crypto.pbkdf2Sync(masterSecret, `fle:${agencyId}`, 100_000, 32, 'sha256');
}

function encryptField(plaintext: string, key: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, 'utf8')),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    cipher: Buffer.concat([encrypted, authTag]).toString('base64'),
    iv: iv.toString('base64'),
  };
}

function mbiIndexHash(mbi: string, agencyId: string): string {
  const masterSecret = process.env.PHI_MASTER_SECRET;
  if (!masterSecret) throw new Error('PHI_MASTER_SECRET is not configured.');
  return crypto
    .createHmac('sha256', masterSecret)
    .update(`${agencyId}:${mbi.toUpperCase().trim()}`)
    .digest('hex');
}

function evaluateSwitchRisk(
  payload: Pick<CrmPayload, 'plan_id' | 'effective_date'>,
  existingPlanId: string
) {
  const planChanged = payload.plan_id !== existingPlanId;
  if (!planChanged) {
    return { riskLevel: 'LOW', status: 'ACTIVE', triggerReason: null, daysUntilEffective: null };
  }

  const effectiveMs = new Date(payload.effective_date).getTime();
  const daysUntilEffective = Math.ceil((effectiveMs - Date.now()) / 86_400_000);

  if (daysUntilEffective > 0) {
    return {
      riskLevel: 'HIGH',
      status: 'PROVISIONALLY_DISENROLLED',
      triggerReason: `Plan switch ${existingPlanId} → ${payload.plan_id} takes effect in ${daysUntilEffective} day(s) (${payload.effective_date}). Call member now.`,
      daysUntilEffective,
    };
  }

  return {
    riskLevel: 'HIGH',
    status: 'PLAN_CHANGED',
    triggerReason: `Plan changed ${existingPlanId} → ${payload.plan_id} effective ${payload.effective_date}.`,
    daysUntilEffective: 0,
  };
}

// ---------------------------------------------------------------------------
// Batch Ingestion Server Action
// ---------------------------------------------------------------------------
export async function processCsvIngestion(
  agencyId: string, 
  brokerId: string, 
  rows: CrmPayload[]
) {
  if (!agencyId || !brokerId) throw new Error('Unauthorized');
  
  const encKey = deriveFieldEncKey(agencyId);
  const batch = adminDb.batch();
  let updatedCount = 0;
  let highRiskCount = 0;

  for (const row of rows) {
    const mbiHash = mbiIndexHash(row.mbi_number, agencyId);
    
    // Lookup member by MBI hash (Server-side query)
    const snap = await adminDb.collection('members')
      .where('mbi_hash', '==', mbiHash)
      .where('agencyId', '==', agencyId)
      .limit(1)
      .get();
      
    if (snap.empty) {
      // New member ingestion
      const mbiEnc = encryptField(row.mbi_number, encKey);
      const dobEnc = encryptField(row.date_of_birth || '', encKey);
      const phoneEnc = encryptField(row.phone_number || '', encKey);
      
      const newRef = adminDb.collection('members').doc();
      batch.set(newRef, {
        agencyId,
        brokerId,
        mbi_hash: mbiHash,
        mbi_number_cipher: mbiEnc.cipher,
        mbi_number_iv: mbiEnc.iv,
        date_of_birth_cipher: dobEnc.cipher,
        date_of_birth_iv: dobEnc.iv,
        phone_number_cipher: phoneEnc.cipher,
        phone_number_iv: phoneEnc.iv,
        current_plan_id: row.plan_id,
        status: 'ACTIVE',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: Date.now(),
      });
      
      batch.set(newRef.collection('status_history').doc(), {
        plan_id: row.plan_id,
        effective_date: row.effective_date,
        previous_plan_id: null,
        status: 'ACTIVE',
        brokerId,
        source: row.source || 'csv_upload',
        recordedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      updatedCount++;
    } else {
      // Existing member update & risk evaluation
      const docRef = snap.docs[0];
      const existing = docRef.data();
      
      if (existing.current_plan_id !== row.plan_id) {
        const risk = evaluateSwitchRisk(row, existing.current_plan_id);
        
        if (risk.riskLevel === 'HIGH') highRiskCount++;
        
        const riskEventRef = adminDb.collection('risk_events').doc();
        batch.set(riskEventRef, {
          memberId: docRef.id,
          agencyId,
          brokerId,
          event: 'PLAN_SWITCH_DETECTED',
          riskLevel: risk.riskLevel,
          previousPlanId: existing.current_plan_id,
          newPlanId: row.plan_id,
          effectiveDate: row.effective_date,
          daysUntilEffective: risk.daysUntilEffective,
          triggerReason: risk.triggerReason,
          source: row.source || 'csv_upload',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batch.update(docRef.ref, {
          current_plan_id: row.plan_id,
          status: risk.status,
          lastRiskEventId: riskEventRef.id,
          updatedAt: Date.now(),
        });

        batch.set(docRef.ref.collection('status_history').doc(), {
          plan_id: row.plan_id,
          effective_date: row.effective_date,
          previous_plan_id: existing.current_plan_id,
          status: risk.status,
          brokerId,
          riskEventId: riskEventRef.id,
          source: row.source || 'csv_upload',
          recordedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        updatedCount++;
      }
    }
  }

  await batch.commit();
  return { updated: updatedCount, highRisk: highRiskCount };
}
