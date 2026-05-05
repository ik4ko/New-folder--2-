'use client';

import { encryptData, decryptData, createAuditHash } from './vault/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
} from 'firebase/firestore';

// HIPAA §164.514(b) — the 18 identifiers that make health data "individually identifiable"
// We map them to the fields that exist on MemberRecord.
export const PHI_FIELDS = [
  'fullName',
  'medicareId',
  'ssnLast4',
  'address',
  'phone',
  'email',
  'dob',
  'healthConditions',
  'lastCallTranscript',
  'pcpName',
  'poaName',
  'poaPhone',
  'pharmacyName',
  'notes',
] as const;

export type PhiField = (typeof PHI_FIELDS)[number];

export interface PhiPayload {
  fullName?: string;
  medicareId?: string;
  ssnLast4?: string;
  address?: string;
  phone?: string;
  email?: string;
  dob?: string;
  healthConditions?: string[];
  lastCallTranscript?: string;
  pcpName?: string;
  poaName?: string;
  poaPhone?: string;
  pharmacyName?: string;
  notes?: string;
}

// Shape written to phi_vault/{agencyId}/records/{memberId}
export interface PhiVaultRecord {
  memberId: string;
  agencyId: string;
  cipher: string;
  iv: string;
  hash: string;
  encryptedAt: number;
  encryptedBy: string;
}

export type AuditAction = 'PHI_READ' | 'PHI_WRITE' | 'PHI_DELETE' | 'PHI_DENIED';

// Shape written to phi_vault/{agencyId}/audit_log/{auto-id}
export interface AuditEntry {
  action: AuditAction;
  memberId: string;
  userId: string;
  agencyId: string;
  timestamp: number;
  hash: string;
  prevHash: string;
}

/**
 * PhiGate is the single choke-point for all PHI access in the app.
 *
 * Separation of concerns:
 *  - Operational metadata (carrier, plan, scores) lives in the `clients` collection — no gate needed.
 *  - PHI (name, MBI, DOB, phone, etc.) lives in `phi_vault/{agencyId}/records/{memberId}` — always encrypted.
 *
 * Construct once per authenticated session after the user unlocks their passphrase.
 */
export class PhiGate {
  private lastAuditHash = '0';

  constructor(
    private readonly db: Firestore,
    private readonly key: CryptoKey,
    private readonly userId: string,
    private readonly agencyId: string
  ) {}

  /** Extract only PHI fields from a full member record object. */
  extractPhi(record: Record<string, any>): PhiPayload {
    const phi: PhiPayload = {};
    for (const field of PHI_FIELDS) {
      if (record[field] !== undefined) {
        (phi as any)[field] = record[field];
      }
    }
    return phi;
  }

  /**
   * Return a shallow copy of `record` with all PHI fields removed.
   * Safe to store in the `clients` collection or pass to non-PHI UI.
   */
  stripPhi<T extends Record<string, any>>(record: T): Omit<T, PhiField> {
    const safe = { ...record };
    for (const field of PHI_FIELDS) {
      delete (safe as any)[field];
    }
    return safe as Omit<T, PhiField>;
  }

  /** Encrypt a PhiPayload and write it to `phi_vault/{agencyId}/records/{memberId}`. */
  async writePhi(memberId: string, phi: PhiPayload): Promise<void> {
    const blob = await encryptData(phi, this.key);
    const vaultRecord: PhiVaultRecord = {
      memberId,
      agencyId: this.agencyId,
      cipher: blob.cipher,
      iv: blob.iv,
      hash: blob.hash,
      encryptedAt: Date.now(),
      encryptedBy: this.userId,
    };
    await setDoc(
      doc(this.db, 'phi_vault', this.agencyId, 'records', memberId),
      vaultRecord
    );
    this.appendAudit('PHI_WRITE', memberId);
  }

  /** Read and decrypt PHI from `phi_vault/{agencyId}/records/{memberId}`. Returns null if not found. */
  async readPhi(memberId: string): Promise<PhiPayload | null> {
    const snap = await getDoc(
      doc(this.db, 'phi_vault', this.agencyId, 'records', memberId)
    );
    if (!snap.exists()) return null;
    const record = snap.data() as PhiVaultRecord;
    const phi = await decryptData(record.cipher, record.iv, this.key);
    this.appendAudit('PHI_READ', memberId);
    return phi as PhiPayload;
  }

  // Non-blocking audit write — HIPAA §164.312(b) requires audit controls.
  // Failures are logged to console but must not block the caller's operation.
  private appendAudit(action: AuditAction, memberId: string): void {
    const prevHash = this.lastAuditHash;
    createAuditHash(action, this.userId, prevHash).then(async (hash) => {
      this.lastAuditHash = hash;
      const entry: AuditEntry = {
        action,
        memberId,
        userId: this.userId,
        agencyId: this.agencyId,
        timestamp: Date.now(),
        hash,
        prevHash,
      };
      addDoc(
        collection(this.db, 'phi_vault', this.agencyId, 'audit_log'),
        entry
      ).catch((e) => console.error('[PhiGate] audit write failed', e));
    });
  }
}
