'use client';

/**
 * Client-side CSV processor for secure member data ingestion.
 *
 * Validates CSV structure and uploads to Firebase Storage at
 * uploads/{agencyId}/{timestamp}_{filename}.csv
 *
 * The Cloud Function processCSVUpload then:
 *  1. Parses the CSV server-side
 *  2. Encrypts PHI fields with AES-256-GCM
 *  3. Writes encrypted records to phi_vault/{agencyId}/records
 *  4. Writes operational metadata to clients/{memberId}
 *  5. Deletes the raw file from Storage
 */

// PHI fields that will be encrypted server-side before Firestore storage.
// Must stay in sync with PHI_FIELDS in src/lib/phi-gate.ts.
export const PHI_COLUMNS = [
  'fullName', 'medicareId', 'ssnLast4', 'address', 'phone', 'email',
  'dob', 'pcpName', 'poaName', 'poaPhone', 'pharmacyName', 'notes',
] as const;

// Operational (non-PHI) columns written to the clients collection.
export const OPERATIONAL_COLUMNS = [
  'id', 'carrier', 'planName', 'enrollmentPeriod', 'monthlyPremium',
  'partAEffective', 'partBEffective', 'status', 'medicareMedicaidStatus',
  'ssbciStatus', 'checkInStatus', 'poaStatus', 'soaStatus', 'soaDate',
  'age', 'retentionScore', 'ptcExpiryDate',
] as const;

// At least these must be present for ingestion to proceed.
export const REQUIRED_COLUMNS = ['carrier', 'age'] as const;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface CSVValidationResult {
  valid: boolean;
  missingRequired: string[];
  phiDetected: string[];   // PHI columns found — reminds the uploader that data will be encrypted
  rowCount: number;
}

export function validateCSVHeaders(csvText: string): CSVValidationResult {
  const firstLine = csvText.split('\n')[0] ?? '';
  const headers = firstLine
    .split(',')
    .map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

  const missingRequired = REQUIRED_COLUMNS.filter(
    r => !headers.includes(r.toLowerCase())
  );

  const phiDetected = PHI_COLUMNS.filter(
    p => headers.includes(p.toLowerCase())
  );

  const lineCount = csvText.trim().split('\n').length - 1;

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    phiDetected,
    rowCount: Math.max(0, lineCount),
  };
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export type UploadProgressCallback = (progress: number) => void;

export interface CSVUploadResult {
  storagePath: string;
}

/**
 * Validates and uploads a CSV file to Firebase Storage for server-side
 * encryption and ingestion. Returns the storage path on success.
 *
 * Throws if the CSV is structurally invalid or if the upload fails.
 */
export async function uploadCSVForProcessing(
  file: File,
  agencyId: string,
  onProgress?: UploadProgressCallback,
): Promise<CSVUploadResult> {
  const text = await file.text();
  const validation = validateCSVHeaders(text);

  if (!validation.valid) {
    throw new Error(
      `CSV is missing required columns: ${validation.missingRequired.join(', ')}`
    );
  }

  const { getApp } = await import('firebase/app');
  const { getStorage, ref, uploadBytesResumable } = await import('firebase/storage');

  const storage = getStorage(getApp());
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `uploads/${agencyId}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: 'text/csv',
      customMetadata: {
        agencyId,
        uploadedAt: new Date().toISOString(),
        rowCount: String(validation.rowCount),
      },
    });

    task.on(
      'state_changed',
      snapshot => {
        if (onProgress) {
          onProgress(
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          );
        }
      },
      reject,
      resolve,
    );
  });

  return { storagePath };
}

// ---------------------------------------------------------------------------
// Template generation
// ---------------------------------------------------------------------------

/** Returns a CSV string with the canonical column header row. */
export function generateCSVTemplate(): string {
  const allColumns = [...OPERATIONAL_COLUMNS, ...PHI_COLUMNS];
  return allColumns.join(',') + '\n';
}
