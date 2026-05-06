'use server'

import { adminDb, admin } from '@/lib/firebase-admin';
import crypto from 'crypto';

interface CrmConfig {
  ghlApiKey?: string;
  webhookUrl?: string;
}

// ---------------------------------------------------------------------------
// Credential Encryption Helpers
// ---------------------------------------------------------------------------
function deriveConfigEncKey(agencyId: string): Buffer {
  const masterSecret = process.env.PHI_MASTER_SECRET;
  if (!masterSecret) throw new Error('PHI_MASTER_SECRET is not configured.');
  // Different salt for CRM keys to prevent cross-context attacks
  return crypto.pbkdf2Sync(masterSecret, `crm:${agencyId}`, 100_000, 32, 'sha256');
}

function encryptCredential(plaintext: string, key: Buffer) {
  if (!plaintext) return null;
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

function decryptCredential(cipherData: any, key: Buffer) {
  if (!cipherData || !cipherData.cipher || !cipherData.iv) return '';
  try {
    const encryptedBuffer = Buffer.from(cipherData.cipher, 'base64');
    const iv = Buffer.from(cipherData.iv, 'base64');
    const authTag = encryptedBuffer.subarray(encryptedBuffer.length - 16);
    const ciphertext = encryptedBuffer.subarray(0, encryptedBuffer.length - 16);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('Decryption error', e);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function saveCrmConfig(agencyId: string, config: CrmConfig) {
  if (!agencyId) throw new Error('Unauthorized');
  
  const encKey = deriveConfigEncKey(agencyId);
  const dataToSave: any = { updatedAt: Date.now() };

  if (config.ghlApiKey !== undefined) {
    dataToSave.ghlApiKey = encryptCredential(config.ghlApiKey, encKey);
  }
  if (config.webhookUrl !== undefined) {
    dataToSave.webhookUrl = encryptCredential(config.webhookUrl, encKey);
  }

  await adminDb.collection('agencies').doc(agencyId).collection('crm_settings').doc('config').set(dataToSave, { merge: true });
  return { success: true };
}

export async function getCrmConfig(agencyId: string): Promise<CrmConfig> {
  if (!agencyId) return {};
  
  const doc = await adminDb.collection('agencies').doc(agencyId).collection('crm_settings').doc('config').get();
  if (!doc.exists) return {};
  
  const data = doc.data() as any;
  const encKey = deriveConfigEncKey(agencyId);
  
  return {
    ghlApiKey: data.ghlApiKey ? decryptCredential(data.ghlApiKey, encKey) : '',
    webhookUrl: data.webhookUrl ? decryptCredential(data.webhookUrl, encKey) : ''
  };
}

export async function syncToCrm(agencyId: string, memberId: string, scriptText: string, riskLevel: string) {
  if (!agencyId || !memberId) throw new Error('Unauthorized');

  // 1. Fetch CRM Config
  const config = await getCrmConfig(agencyId);
  if (!config.ghlApiKey && !config.webhookUrl) {
    throw new Error('No CRM configuration found. Please setup in Settings.');
  }

  // 2. Fetch Member Data
  const memberSnap = await adminDb.collection('members').doc(memberId).get();
  if (!memberSnap.exists) throw new Error('Member not found');
  const member = memberSnap.data() as any;

  // 3. Decrypt Member Phone/MBI for payload
  const phiEncKey = crypto.pbkdf2Sync(process.env.PHI_MASTER_SECRET!, `fle:${agencyId}`, 100_000, 32, 'sha256');
  const phone = decryptCredential({ cipher: member.phone_number_cipher, iv: member.phone_number_iv }, phiEncKey);
  const mbi = decryptCredential({ cipher: member.mbi_number_cipher, iv: member.mbi_number_iv }, phiEncKey);

  const payload = {
    mbi,
    phone,
    riskLevel,
    currentPlanId: member.current_plan_id,
    talkingPoints: scriptText,
    source: 'AegisSage-Intelligence'
  };

  const results = [];

  // 4a. GHL Integration
  if (config.ghlApiKey) {
    try {
      // Mocked GHL 'Create/Update Contact' API
      // In a real scenario, we'd use fetch() to https://rest.gohighlevel.com/v1/contacts/
      /*
      await fetch('https://rest.gohighlevel.com/v1/contacts/', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.ghlApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: payload.phone,
          tags: ['AegisSage-High-Risk'],
          customField: { talking_points: payload.talkingPoints }
        })
      });
      */
      console.log('Mock GHL Sync triggered for', phone);
      results.push('GHL');
    } catch (e) {
      console.error('GHL Sync failed', e);
      throw new Error('GHL Sync failed');
    }
  }

  // 4b. Webhook Outbound Logic (EnrollHere)
  if (config.webhookUrl) {
    try {
      const resp = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(`Webhook failed with status ${resp.status}`);
      results.push('Webhook');
    } catch (e) {
      console.error('Webhook Sync failed', e);
      throw new Error('Webhook Sync failed');
    }
  }

  // 5. Update UI Sync Feedback
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  
  await adminDb.collection('members').doc(memberId).update({
    lastCrmSync: timestamp
  });

  await adminDb.collection('members').doc(memberId).collection('crm_sync_logs').add({
    destinations: results,
    payloadSnippet: { riskLevel, hasScript: !!scriptText },
    syncedAt: timestamp
  });

  return { success: true, destinations: results };
}
