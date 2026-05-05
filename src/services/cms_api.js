/**
 * AegisSage — CMS Blue Button 2.0 / Beneficiary Claims Data API
 *
 * Official program: https://bluebutton.cms.gov/
 * API version:      v2 (FHIR R4)
 * Sandbox base URL: https://sandbox.bluebutton.cms.gov/v2/
 * Production base URL: https://api.bluebutton.cms.gov/v2/
 *
 * Integration status: PLACEHOLDER — hooks scaffolded for CMS review.
 * OAuth2 app registration required at https://bluebutton.cms.gov/developers/
 *
 * Required environment variables (set in .env.local or Firebase secrets):
 *   BB2_CLIENT_ID      — assigned by CMS on app registration
 *   BB2_CLIENT_SECRET  — assigned by CMS on app registration
 *   BB2_REDIRECT_URI   — registered callback URL (e.g. https://aegissage.com/api/bb2/callback)
 *   BB2_ENV            — 'sandbox' | 'production'  (default: 'sandbox')
 */

const BB2_ENDPOINTS = {
  sandbox: {
    base:      'https://sandbox.bluebutton.cms.gov/v2',
    authorize: 'https://sandbox.bluebutton.cms.gov/o/authorize/',
    token:     'https://sandbox.bluebutton.cms.gov/o/token/',
    revoke:    'https://sandbox.bluebutton.cms.gov/o/revoke_token/',
  },
  production: {
    base:      'https://api.bluebutton.cms.gov/v2',
    authorize: 'https://bluebutton.cms.gov/o/authorize/',
    token:     'https://bluebutton.cms.gov/o/token/',
    revoke:    'https://bluebutton.cms.gov/o/revoke_token/',
  },
};

class BlueButtonApiClient {
  /**
   * @param {string} clientId
   * @param {string} clientSecret
   * @param {string} redirectUri
   * @param {'sandbox'|'production'} env
   */
  constructor(clientId, clientSecret, redirectUri, env = 'sandbox') {
    this.clientId    = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.endpoints   = BB2_ENDPOINTS[env] ?? BB2_ENDPOINTS.sandbox;
  }

  // ---------------------------------------------------------------------------
  // Step 1 — OAuth2 Authorization URL
  //
  // Build the URL that redirects the Medicare beneficiary to CMS to consent
  // to sharing their claims data with AegisSage.
  //
  // @param {string} state  — random CSRF token; store in session, verify on callback
  // @returns {string}      — redirect URL
  // ---------------------------------------------------------------------------
  buildAuthorizationUrl(state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id:     this.clientId,
      redirect_uri:  this.redirectUri,
      state,
    });
    return `${this.endpoints.authorize}?${params.toString()}`;
  }

  // ---------------------------------------------------------------------------
  // Step 2 — Exchange Authorization Code for Tokens
  //
  // Called from the /api/bb2/callback route after CMS redirects back.
  // Returns { access_token, refresh_token, expires_in, token_type }.
  //
  // @param {string} code — authorization code from query string
  // @returns {Promise<object>}
  // ---------------------------------------------------------------------------
  async exchangeCodeForToken(code) {
    // TODO: POST to this.endpoints.token with:
    //   grant_type=authorization_code, code, redirect_uri
    //   Authorization: Basic base64(clientId:clientSecret)
    throw new Error('BlueButtonApiClient.exchangeCodeForToken() — not yet implemented.');
  }

  // ---------------------------------------------------------------------------
  // Step 3 — Beneficiary Profile (FHIR Patient resource)
  //
  // Returns the authenticated beneficiary's demographics.
  // CMS uses a hashed beneficiary ID (not MBI) for privacy.
  //
  // @param {string} accessToken
  // @returns {Promise<object>}  FHIR Patient resource
  // ---------------------------------------------------------------------------
  async getBeneficiaryProfile(accessToken) {
    // TODO: GET /v2/fhir/Patient/?_format=json
    throw new Error('BlueButtonApiClient.getBeneficiaryProfile() — not yet implemented.');
  }

  // ---------------------------------------------------------------------------
  // Step 4 — Claims Data (FHIR ExplanationOfBenefit)
  //
  // Returns Part A (inpatient/outpatient), Part B (physician/DME), and
  // Part D (prescription drug) claims as a FHIR Bundle.
  //
  // @param {string} accessToken
  // @param {{ startDate?: string, endDate?: string }} options  — ISO 8601 dates
  // @returns {Promise<object>}  FHIR Bundle<ExplanationOfBenefit>
  // ---------------------------------------------------------------------------
  async getClaimsData(accessToken, { startDate, endDate } = {}) {
    // TODO: GET /v2/fhir/ExplanationOfBenefit/
    //   ?_format=json
    //   &_lastUpdated=ge{startDate}
    //   &_lastUpdated=le{endDate}
    throw new Error('BlueButtonApiClient.getClaimsData() — not yet implemented.');
  }

  // ---------------------------------------------------------------------------
  // Step 5 — Coverage Data (FHIR Coverage)
  //
  // Returns Part A, B, and D enrollment periods — useful for detecting gaps
  // in coverage and validating effective dates sent by the CRM.
  //
  // @param {string} accessToken
  // @returns {Promise<object>}  FHIR Bundle<Coverage>
  // ---------------------------------------------------------------------------
  async getCoverageData(accessToken) {
    // TODO: GET /v2/fhir/Coverage/?_format=json
    throw new Error('BlueButtonApiClient.getCoverageData() — not yet implemented.');
  }

  // ---------------------------------------------------------------------------
  // Utility — Refresh an expired access token
  //
  // @param {string} refreshToken  — stored securely per beneficiary
  // @returns {Promise<object>}    — new { access_token, expires_in }
  // ---------------------------------------------------------------------------
  async refreshAccessToken(refreshToken) {
    // TODO: POST to this.endpoints.token with grant_type=refresh_token
    throw new Error('BlueButtonApiClient.refreshAccessToken() — not yet implemented.');
  }

  // ---------------------------------------------------------------------------
  // Utility — Revoke consent (beneficiary opt-out)
  //
  // Must be supported to comply with CMS terms and HIPAA Right of Revocation.
  //
  // @param {string} token  — access_token or refresh_token to revoke
  // @returns {Promise<void>}
  // ---------------------------------------------------------------------------
  async revokeToken(token) {
    // TODO: POST to this.endpoints.revoke with token + client credentials
    throw new Error('BlueButtonApiClient.revokeToken() — not yet implemented.');
  }
}

/**
 * Factory — creates a configured client from environment variables.
 * Throws early if any required var is missing so misconfiguration is caught
 * at startup, not on the first API call.
 *
 * @returns {BlueButtonApiClient}
 */
function createBlueButtonClient() {
  const { BB2_CLIENT_ID, BB2_CLIENT_SECRET, BB2_REDIRECT_URI, BB2_ENV } = process.env;

  if (!BB2_CLIENT_ID || !BB2_CLIENT_SECRET || !BB2_REDIRECT_URI) {
    throw new Error(
      'Blue Button 2.0 requires BB2_CLIENT_ID, BB2_CLIENT_SECRET, and BB2_REDIRECT_URI env vars. ' +
      'Register your app at https://bluebutton.cms.gov/developers/'
    );
  }

  const env = (BB2_ENV === 'production') ? 'production' : 'sandbox';
  return new BlueButtonApiClient(BB2_CLIENT_ID, BB2_CLIENT_SECRET, BB2_REDIRECT_URI, env);
}

module.exports = { BlueButtonApiClient, createBlueButtonClient, BB2_ENDPOINTS };
