/**
 * AegisSage — Insurance License Verification Service
 *
 * Handles NPN format validation and provides the integration surface for
 * real-time license verification against the NIPR Producer Database (PDB).
 */

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface LicenseValidationResult {
  valid: boolean;
  npn: string;
  error?: string;
}

export interface NIPRLookupResult {
  npn: string;
  firstName?: string;
  lastName?: string;
  /** State codes where the producer holds an active license (e.g. ['FL','TX']) */
  licenseStates?: string[];
  licenseStatus?: 'Active' | 'Inactive' | 'Expired' | 'Unknown';
  lookupTimestamp: string;
}

// ---------------------------------------------------------------------------
// LicenseValidator
// ---------------------------------------------------------------------------

export class LicenseValidator {

  /**
   * Validates that an NPN meets the NIPR format specification:
   * exactly 10 numeric digits, no letters, spaces, or special characters.
   *
   * NPNs are permanent identifiers assigned by the NIPR at the time of
   * initial licensure and never change, regardless of state or line of
   * authority. They are NOT the same as a state license number.
   */
  static validateNpnFormat(npn: string): LicenseValidationResult {
    const cleaned = npn.trim();

    if (!cleaned) {
      return { valid: false, npn: cleaned, error: 'NPN is required.' };
    }
    if (!/^\d{10}$/.test(cleaned)) {
      return {
        valid: false,
        npn: cleaned,
        error: 'NPN must be exactly 10 numeric digits (no letters or spaces).',
      };
    }

    return { valid: true, npn: cleaned };
  }

  /**
   * Validates a US phone number.
   *
   * Accepts bare 10-digit (2025551234), +1 prefix (+12025551234),
   * parenthetical ((202) 555-1234), and dash/dot-separated formats.
   */
  static validatePhoneFormat(phone: string): boolean {
    return /^(\+1[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})$/.test(
      phone.trim(),
    );
  }

  /**
   * Verify a producer's NPN against the NIPR Producer Database (PDB) Gateway.
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │  TODO: NIPR PDB Gateway integration                                 │
   * │                                                                     │
   * │  Program  : NIPR Producer Database (PDB)                           │
   * │  Endpoint : POST https://pdb.nipr.com/pdb-gateway/v2/npn/{npn}    │
   * │  Auth     : Bearer token — requires a signed NIPR Data Sharing     │
   * │             Agreement (DSA). Apply at nipr.com → Contact Us.       │
   * │                                                                     │
   * │  Implementation steps:                                              │
   * │  1. Execute DSA with NIPR and obtain API credentials.              │
   * │  2. Store credentials in Firebase Secret Manager:                  │
   * │       firebase functions:secrets:set NIPR_API_KEY                  │
   * │  3. Replace stub below with authenticated fetch to PDB endpoint.   │
   * │  4. Parse response: check licenseStatus === 'Active' and that the  │
   * │     producer holds a license in the user's operating state.        │
   * │  5. Cache result in Firestore at licenses/{npn} with a 24-hour    │
   * │     TTL to stay within NIPR rate limits.                           │
   * │  6. Store lookupTimestamp on the agency doc for audit traceability │
   * │     under HIPAA §164.312(b).                                       │
   * │                                                                     │
   * │  NIPR response shape (simplified):                                  │
   * │  {                                                                  │
   * │    npn: string,                                                     │
   * │    firstName: string,                                               │
   * │    lastName: string,                                                │
   * │    licenseStates: string[],   // e.g. ['FL', 'TX', 'GA']          │
   * │    licenseStatus: 'Active' | 'Inactive' | 'Expired',              │
   * │    lastUpdated: string,       // ISO 8601                          │
   * │  }                                                                  │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * @param npn - The 10-digit National Producer Number to verify.
   * @returns NIPRLookupResult — currently a synthetic passing result.
   * @throws if the NPN fails local format validation.
   */
  static async verifyWithNIPR(npn: string): Promise<NIPRLookupResult> {
    const formatCheck = LicenseValidator.validateNpnFormat(npn);
    if (!formatCheck.valid) {
      throw new Error(formatCheck.error);
    }

    // PLACEHOLDER — real NIPR API call goes here (see TODO above).
    return {
      npn,
      firstName:      undefined,
      lastName:       undefined,
      licenseStates:  [],
      licenseStatus:  'Active',
      lookupTimestamp: new Date().toISOString(),
    };
  }
}
