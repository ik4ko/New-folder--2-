/**
 * Firestore collection schemas for AegisSage HIPAA isolation architecture.
 *
 * Two-collection split:
 *
 *  phi_vault/{agencyId}/records/{memberId}
 *    → AES-256-GCM encrypted PHI blob. Never read without PhiGate.
 *    → Write path: PhiGate.writePhi()
 *    → Read path:  PhiGate.readPhi()
 *
 *  phi_vault/{agencyId}/audit_log/{auto-id}
 *    → Append-only HIPAA audit chain. Immutable after write.
 *
 *  clients/{memberId}
 *    → Operational metadata only. No PHI. Safe for dashboards and AI flows.
 *
 *  vaults/{userId}
 *    → Legacy agency settings vault (agencyProfile, GHL config, Maya config).
 *      Retained for backward compatibility with the Hydra PHI Vault page.
 */

import type { PhiPayload, PhiVaultRecord, AuditEntry } from './phi-gate';

export type { PhiPayload, PhiVaultRecord, AuditEntry };

// ---------------------------------------------------------------------------
// clients/{memberId}
// Operational metadata — no PHI. Firestore rules allow authenticated agency
// members to read/write. AI flows (churn prediction, CMS check) read from here.
// ---------------------------------------------------------------------------
export interface ClientDoc {
  // Identity (non-PHI)
  id: string;
  agencyId: string;
  agentId?: string;

  // Coverage
  carrier: string;
  planName: string;
  enrollmentPeriod: 'IEP' | 'AEP' | 'SEP' | 'OE';
  monthlyPremium: string;
  partAEffective: string;
  partBEffective: string;

  // Status flags
  status: 'active' | 'churn-risk' | 'pending';
  medicareMedicaidStatus: 'None' | 'Medicare' | 'Medicaid' | 'Both';
  ssbciStatus: 'not-needed' | 'pending-fax' | 'faxed' | 'approved';
  checkInStatus: 'scheduled' | 'called' | 'completed' | 'escalated';
  poaStatus: 'unprotected' | 'pending-invite' | 'shielded';
  soaStatus: string;
  soaDate?: string;

  // Scores and analytics
  retentionScore: number;
  age: number;
  lastCallSentiment?: string;

  // CMS tracking
  lastCmsCheck?: number;
  futureContract?: string;
  futurePlanName?: string;
  futureEffectiveDate?: string;

  // Consent
  ptcExpiryDate: string;

  // Timestamps
  lastSync: string;
  lastReviewDate?: string;
  updatedAt?: number;
}

// ---------------------------------------------------------------------------
// phi_vault/{agencyId}  (parent document — intentionally empty; rules block direct read)
// phi_vault/{agencyId}/records/{memberId}  → PhiVaultRecord  (from phi-gate.ts)
// phi_vault/{agencyId}/audit_log/{auto-id} → AuditEntry      (from phi-gate.ts)
// ---------------------------------------------------------------------------

// Convenience type guard used by Firestore converters
export function isPhiVaultRecord(data: unknown): data is PhiVaultRecord {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.memberId === 'string' &&
    typeof d.agencyId === 'string' &&
    typeof d.cipher === 'string' &&
    typeof d.iv === 'string' &&
    typeof d.encryptedAt === 'number'
  );
}

export function isClientDoc(data: unknown): data is ClientDoc {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d.id === 'string' && typeof d.agencyId === 'string';
}
