# Aegis Sage — Changelog

## [Deep Audit: Bug Fixes — Invite API, Agency Scoping, Manager Data Leak] — 2026-05-28

### Bulk Invite Fix (`/api/team/invite/route.ts`)
- Relaxed validation: `last_name` is no longer required. Bulk invites that provide email only will derive `first_name` from the email prefix automatically.
- Single invite via the UI still enforces first + last name via the client-side check (unchanged).
- Error message updated from "email, first_name, and last_name are required" → "email is required".
- This fixes the blocker where bulk invite always returned 400 despite a valid email address.

### Manager Page — Agency Scoping Fixes (`/dashboard/manager/page.tsx`)
- **Critical data leak fixed**: All queries in the Manager (Agency View) page were missing `agency_id` filters. This could have exposed cross-agency stats to any manager-role user.
- Revenue at Risk `switch_alerts` count: added `.eq('agency_id', agencyId)`.
- Fax Audit Trail `vcc_submissions` query: added `.eq('agency_id', agencyId)`.
- All 7 broker performance queries (clients, open alerts, total alerts, resolved alerts, VCC count, campaigns, AOR locked): added `.eq('agency_id', agencyId)` to every query. Also migrated from user-scoped `supabase` client to `supabaseAdmin` (service client) for consistency — these queries need to be authoritative for reporting.
- Added null guard: if `agencyId` is undefined (no agency found), redirect to `/dashboard` immediately.

## [UX Overhaul: Lock Removal, RBAC, Future-Switch Alerts, Doctor/VCC] — 2026-05-28

### Aegis Lock (AOR) — Removed
- Removed "Aegis Lock" from sidebar nav (`CORE_NAV`) — no longer a focus area.
- Removed the "Lock" button from every row in `book-member-table.tsx`.
- AOR routes/tables preserved in the DB for historical data; just hidden from the UI.

### Future-Switch Notification Priority — CRITICAL
- `getEnrollmentBadge()` now distinguishes **future** vs **past** effective dates.
- If `future_effective_date > today`: badge becomes "🚨 Switching Soon" — red, bold, with "CONTACT CLIENT NOW" sub-label and a thick red left border. This is the most urgent state.
- If date is past or no date: remains "⚠ Pending Switch" (orange) — still actionable but lower urgency.
- New **Critical filter tab** added to the member table header — pulses red when critical clients exist, jumps directly to that filtered view.

### Doctor Info + VCC Pre-fill
- **DB migration** `20260528020000`: Added `doctor_name` and `doctor_fax` columns to `book_of_business`.
- **`DoctorInfoCard`** component: inline edit on the member detail page — add/edit PCP name and fax number with a single click. "Fill VCC" button appears once info is saved.
- **VCC new page** (`/dashboard/vcc/new?bob=<id>`): Pre-fills client name, MBI, doctor name, and fax number automatically from the Book of Business member record. Added C-SNP/Chronic checkbox. Consolidated dispatch choice into Step 3 (Physician). 4-step flow now: Carrier → Client → Physician → Review & Send.
- **GHL sync**: Extended `GHL_FIELD_MAP` to import `doctor_name`/`doctor_fax` from GHL custom fields automatically (`doctor_name`, `physician_name`, `pcp_name`, `doctor_fax`, `physician_fax`, `pcp_fax`, `fax_number`).
- **API**: New `PATCH /api/book/update-doctor` — updates doctor_name/doctor_fax for any BOB member within the caller's agency.

### RBAC / Role Differentiation
- **Sidebar role chip**: Owner, Manager, CS, or Broker label displayed at top right of sidebar brand area in matching color (yellow/blue/violet/slate).
- **GHL Sync** moved to Management nav section (only visible to owners/managers).
- **Team page seat count**: Fixed double-counting — if the agency owner has a broker row with `role='agency_owner'`, they are already in the `brokers.length` count. Removed the incorrect `+1`.
- **Role stats grid**: Added "Owners" stat card to the team page (4 columns: Owners, Managers, CS, Brokers).
- **Owner row protection**: "YOU" label on owner's row instead of delete button — owners can't accidentally remove themselves.
- **Invite flow**: Only owners can invite team members (unchanged); delete button no longer shown for `agency_owner` rows.

## [Critical Fix: Email Dispatch + Switch Display] — 2026-05-28

### Root Cause: verify route truncated — emails never sent
- `src/app/api/marx/verify/route.ts` was cut off at line 360 mid-function. The entire alert insert, dedup check, and `sendSwitchAlertEmail` call were missing. The route returned no response after the DB update, silently dropping all alerts.
- **Fix**: Rewrote the complete file (430 lines). Email dispatch is now unconditional when `alertType` is set and broker has a notification email.

### Root Cause: plan_name / carrier overwritten on every MARx scan
- When a switch was detected, the verify route overwrote `plan_name` and `carrier` with the NEW plan data. The dashboard then showed the new plan in both the Plan column AND the "Now:" badge — the broker couldn't see what the member was originally enrolled in.
- **Fix**: Two new DB columns: `detected_plan_name` and `detected_carrier_name`. When a switch fires, the new plan goes into these columns and `plan_name`/`carrier` are left untouched (preserving the original enrollment).
- **Carrier column**: Now uses `original_carrier_name` (set at roster upload, never overwritten) as the primary display value.
- **Badge "Now:"**: Shows `detected_carrier_name — detected_plan_name` so brokers see exactly what the member switched TO.
- **CSV export**: Added Switched To Carrier and Switched To Plan columns.
- **Backfill**: Populated `detected_plan_name` / `detected_carrier_name` for all existing switched members from the plan directory via their `last_known_plan_code`.

### Migration applied: `add_detected_plan_carrier_columns`
- `detected_plan_name TEXT`, `detected_carrier_name TEXT` added to `book_of_business`

## [Tests + Bug Fixes] — 2026-05-28

### Test Suite — All 90 Tests Passing (src/__tests__/)
- **Jest config fixed**: Replaced `preset: 'ts-jest'` (broken with jest@30 nested hoisting) with explicit `transform` using absolute `require.resolve('ts-jest')` path. Patched nested `jest-config` in `@jest/core` and `jest-cli` to handle absolute paths in the `resolve()` validator.
- **New test file**: `jest.config.js` replaces `jest.config.ts` (ts-node not installed; JS config runs directly)
- **`npm test` script**: Updated to `jest --config jest.config.js`; added `test:watch` variant
- **Bug caught — `carriersMatch` empty-string guard**: `!a || !b` treated `''` as missing data and returned `true` (no alert). Fixed to `a == null || b == null` — empty carrier strings now correctly trigger comparison and can produce alerts. Fixed in both `src/__tests__/carrier-normalization.test.ts` and `src/app/api/marx/verify/route.ts`
- **Bug caught — `isValidMbi` pre-strip**: Function was stripping non-alphanumeric chars before checking length, so a hyphenated 12-char MBI like `1EG4-TE5MK73` falsely passed (strips to 11). Fixed to strict regex `/^[A-Z0-9]{11}$/` — requires input to already be clean. Callers must call `sanitizeMbi()` first.
- **4 test files covering core business logic**:
  - `carrier-normalization.test.ts` — 27 tests: same-carrier aliasing (Cigna/HealthSpring, Aetna/CVS, UHC/United/Optum, Anthem/BCBS/Elevance), cross-carrier discrimination, null/empty safety
  - `h-number-extraction.test.ts` — 20 tests: H/S/E plan code validation, extraction from full roster strings like "Humana Gold Plus H7617-035 PPO"
  - `mbi-sanitization.test.ts` — 19 tests: hyphen/space/case normalization, truncation, strict validation, sanitize→validate pipeline
  - `ghl-field-extraction.test.ts` — 24 tests: GHL custom field mapping, white-label response shape variants (customFields/custom_fields, field_key/key/id properties), null/empty handling

## [GHL OAuth + Email + Dashboard + Sync] — 2026-05-28

### GHL OAuth Flow — Hardened (src/app/api/ghl/connect/route.ts + callback/route.ts)
- **Root cause**: No `state` parameter in OAuth URL — if the Supabase session cookie was lost during GHL's redirect cycle, the callback had no way to identify the user, causing silent redirect to `/login`
- **Fix (connect)**: Generate a signed HMAC state token embedding `userId` + nonce. Set it as an `HttpOnly` `SameSite=Lax` cookie. Log `redirect_uri` on every initiation so mismatches are visible in Vercel logs
- **Fix (callback)**: Verify state cookie matches query param, extract `userId` from state (resilient to session loss). Falls back to `getSession()` if state is absent. Uses `createServiceClient` (not session-scoped client) to look up broker — works even if Supabase session cookie is not preserved through GHL's domain-hop
- **Defensive `last_synced_at`**: Stamped separately in a non-fatal `try/catch` — won't break GHL connection if migration 20260528000000 hasn't been applied yet

### GHL Incremental Sync — NEW (src/app/api/ghl/sync/route.ts)
- New `POST /api/ghl/sync` route: pulls only contacts added/updated since `last_synced_at` in `agency_credentials`
- Accepts `{ force: true }` body to trigger a full re-import
- Upserts in batches of 200 to avoid request timeouts
- Auto-refreshes GHL access token if expiry < 5 minutes away
- Stamps `last_synced_at` after every successful sync
- **UI**: Added "Sync New Contacts" and "Re-Import All Contacts" buttons to `/ghl` page (connected-state only)
- **DB**: Migration `20260528000000_ghl_sync_tracking` adds `last_synced_at` column to `agency_credentials`

### Email Templates — Complete Redesign (src/lib/email/send-notifications.ts)
- **Removed**: "or passed away" from termed/disenrolled email body (unprofessional, inaccurate)
- **Added**: HTML templates with dark card design — Previous Plan vs New Plan shown side-by-side with carrier
- **Termed/No-Plan**: Labeled "🚨 CRITICAL" with previous plan clearly shown, no assumption about cause of disenrollment
- **Carrier Switch**: "🔴 ALERT" with `previousCarrier → newCarrier` layout
- **Pending Switch**: "⚠ ACTION REQUIRED" with effective date and incoming plan
- **Plan Change**: "⚠ WARNING" with old vs new plan side-by-side
- **API change**: `sendSwitchAlertEmail` now accepts `previousPlanName`, `previousCarrier`, `newPlanName`, `newCarrier` instead of opaque H-number strings. Caller in `verify/route.ts` updated.

### Dashboard Color Coding (src/components/book-member-table.tsx)
- `verification_status = 'changed'` → Red left border + badge "🔴 Switched" + sub-label showing current plan
- `verification_status = 'pending_switch'` → Orange left border + badge "⚠ Pending Switch" + future plan + effective date
- `verification_status = 'termed'` or `'missing'` → Red left border + badge "✗ Not Found / Left Plan"
- `needsAction` flag extended to include all switch-related verification statuses so the "Act" button appears for all alert states

### Files Changed
- `src/app/api/ghl/connect/route.ts` — state token, session check, logging
- `src/app/api/ghl/callback/route.ts` — state verification, service-client user lookup, defensive `last_synced_at`
- `src/app/api/ghl/sync/route.ts` — NEW incremental/full sync endpoint
- `src/app/ghl/page.tsx` — Sync New Contacts + Re-Import All Contacts buttons
- `src/lib/email/send-notifications.ts` — full email template redesign
- `src/app/api/marx/verify/route.ts` — updated `sendSwitchAlertEmail` call signature
- `src/components/book-member-table.tsx` — row-level color coding by verification_status
- `supabase/migrations/20260528000000_ghl_sync_tracking.sql` — add `last_synced_at` to `agency_credentials`

---

## [Switch Detection Overhaul] — 2026-05-27

### Root Causes Found and Fixed

#### Bug 1: Carrier detection was physically impossible
The extension explicitly sends `detectedCarrier: null` (CMS MARx shows H-numbers, not carrier names). The server's `carrierChanged` check used `detectedCarrier`, so it was always `false` — carrier switches could never be detected regardless of data.

**Fix:** `carrierChanged` now uses `realCarrierName` resolved from `plan_pbp_directory` lookup on the detected H-number.

#### Bug 2: Carrier sub-brands caused false negatives AND false positives
`plan_pbp_directory` stores brand names ("HealthSpring") while rosters store parent company names ("Cigna"). Simple string comparison broke for every Cigna/HealthSpring, Aetna/CVS, Anthem/BCBS member.

**Fix:** Added `canonicalCarrier()` normalization function mapping all known MA sub-brands to parent company keys before comparison (Cigna, Aetna, Humana, Anthem/BCBS, UHC, Wellcare, Centene, Molina, Devoted, Clover, Kaiser).

#### Bug 3: Pre-scan switches silently discarded
When a member's first MARx scan revealed a different carrier than the roster, the new plan was stored as the baseline and no alert fired. Any switch that happened before the first scan was permanently missed.

**Fix:** At baseline time, compare roster carrier (`original_carrier_name || carrier`) vs `realCarrierName`. If they differ, fire a `carrier_switch` alert instead of silently storing the new plan as baseline.

#### Bug 4: H-number extraction failed for plan names from roster
`storedCode = member.last_known_plan_code || member.plan_id`. Roster-uploaded `plan_id` is a plan name string ("Humana Gold Plus H7617-035 PPO"), not a clean H-number. All regex extractions returned null, making the comparison branch fall through with no result.

**Fix:** Added `extractHNumber()` that finds H/S/E-numbers embedded anywhere in a string. Added `original_contract_id`/`original_pbp` as an additional storedCode source.

#### Bug 5: `original_carrier_name` was never populated
The immutable roster carrier field existed in the schema but was never set by roster upload, so the verify route always fell back to `carrier` (which MARx scans can overwrite).

**Fix:** Migration `20260527030000` backfills `original_carrier_name = carrier` for all existing members. Roster upload action now sets `original_carrier_name` on every upsert.

#### Bug 6: `mbi` column never populated from roster
The verify route falls back to MBI lookup when `memberId` is absent. Without `mbi` set on upload, members could only be found by their UUID.

**Fix:** Migration backfills `mbi` from `member_id` where length = 11 (valid MBI format). Roster upload now extracts and stores clean MBI on every upsert.

### Files Changed
- `src/app/api/marx/verify/route.ts` — complete rewrite of comparison logic
- `src/app/actions/roster-upload.ts` — upsert now sets `original_carrier_name` and `mbi`
- `supabase/migrations/20260527030000_backfill_original_carrier_and_mbi.sql` — applied

---

## [Production Deploy] — 2026-05-27

- **Build fix**: Removed orphaned expression at `roster-upload.ts:500-501` (truncation artifact) causing Turbopack parse failure
- **Added `.vercelignore`**: Excludes `node_modules`, `.next`, `.git`, etc — reduces upload size
- **Deployed to production**: `https://www.aegissage.com` (deployment `GpquwKQEGnnJYuqVPsph6ds1Ycsg`, ready in 2m)

---

## [Beta Hardening] — 2026-05-27

### Infrastructure & Reliability

#### Retry Utility (`src/lib/utils/retry.ts`) — NEW
- Added `withRetry<T>()`: exponential backoff with ±20% jitter, configurable attempts/delay/cap, per-operation label logging, and optional `shouldRetry` predicate to skip non-retriable errors (e.g. auth failures)
- Added `withRetrySafe<T>()`: same as above but returns `{ data, error }` instead of throwing — used for non-critical paths where partial success is acceptable

#### Marx Lookup Hardening (`src/app/api/marx/verify/route.ts`)
- All DB writes (member status update, alert insert, delivery log) wrapped with `withRetrySafe` (3 attempts, 300 ms base delay)
- `needs_reverification = true` flag set on `book_of_business` when member UPDATE fails all retries — enables future re-scan without data loss
- Alert INSERT uses explicit generic typing (`withRetrySafe<{ id: string }>`) to satisfy TypeScript's `PromiseLike` constraint
- Email send wrapped with `withRetry` (2 attempts, 500 ms base delay); delivery outcome written to `alert_delivery_log` regardless of success/failure
- Auth email fallback: if `broker.email` is null, resolves address from `auth.admin.getUserById`

#### Marx Bulk-Check Hardening (`src/app/api/marx/bulk-check/route.ts`)
- Replaced `Promise.all` with `Promise.allSettled` so one batch failure doesn't block others
- Each update (verified / missing) independently wrapped with `withRetrySafe` (3 attempts)
- Returns `warnings[]` in response JSON on partial failure for caller visibility

### Roster Upload

#### Per-Row Error Capture (`src/lib/churn/roster-parser.ts`)
- Added `RosterParseError` and `ParseResult` interfaces
- New `parseRosterFileWithErrors()` wraps each row in try/catch; collects failures without aborting the entire file
- Original `parseRosterFile()` preserved for backward-compat (delegates to new function)

#### Error Persistence (`src/app/actions/roster-upload.ts`, `src/app/api/roster/upload/route.ts`)
- Bad rows batched (200/request) and inserted to `roster_upload_errors` table after successful upload record creation
- Fire-and-forget patterns (`roster_members` insert, `roster_uploads` insert for unmatched groups) converted from `.catch()` on `PostgrestFilterBuilder` to `try { await ... } catch {}` — fixes TypeScript TS2551

#### Audit log in Campaigns (`src/app/actions/campaigns.ts`)
- Best-effort audit log insert wrapped in `try/catch` — fixes TS2339 `.catch` on `PromiseLike<void>`

### Alert Dispatch

#### Per-Broker Isolation (`src/lib/email/send-notifications.ts`)
- `notifyOpenAlerts`: grouped by broker, outer `Promise.allSettled` — one broker's failure doesn't block others; `notified_at` only stamped on confirmed send
- `notifyNewSwitchAlerts`: dual `Promise.allSettled` (per-broker outer, per-alert inner up to 5 alerts)
- `sendWeeklyDigests`: `Promise.allSettled` across all brokers
- `sendSwitchAlertEmail`: now re-throws on failure so callers can record delivery state
- Per-alert delivery outcome written to `alert_delivery_log` (channel, recipient, status, error)

### Bug Fixes

#### Member Delete Unblocked
- **Root cause 1**: `switch_alerts.bob_member_id` FK had no `ON DELETE CASCADE` — any member with alerts blocked deletion with a FK violation
- **Root cause 2**: `book_of_business.verification_status` CHECK only allowed `('verified','missing','new','unverified')` — Marx statuses (`'termed'`,`'pending_switch'`,`'aor_lost'`,`'changed'`) failed silently, leaving members in bad state
- **Fix**: Migration `20260527010000` drops and re-adds the FK with CASCADE; drops and re-adds the CHECK with full value set

#### Marx Alert Inserts Unblocked
- **Root cause 1**: `switch_alerts.ghl_contact_id NOT NULL` — Marx alerts have no GHL contact, every insert failed
- **Root cause 2**: `alert_type` CHECK only covered legacy roster types; all Marx types (`'termed'`,`'pending_switch'`,`'aor_change'`,`'plan_switch'`,`'carrier_switch'`) violated constraint
- **Root cause 3**: Missing columns `switch_type`, `detection_source`, `effective_date`, `detected_at` referenced in code but absent from schema
- **Fix**: Migration `20260527020000` makes `ghl_contact_id` nullable, expands `alert_type` CHECK, and adds all missing columns with appropriate defaults and indexes

#### Google Sheets Import — CSV Parsing (`src/app/api/roster/sheets-import/route.ts`)
- **Root cause**: Naive `parseCSV` split on every comma, destroying quoted fields (e.g. `"Smith, John"`, `"Devoted Health, Medicare Plans"`) and shifting all subsequent column indices — caused dropped rows (MBI in wrong column), carrier detection failures, and missing members
- **Fix**: Full RFC 4180-compliant state-machine CSV parser that correctly handles quoted fields, escaped double-quotes (`""`), and CRLF/LF line endings
- Deduplication reduce typed with explicit generic `Record<string, Record<string, unknown>>` to resolve TS18046 (`r` is `unknown`)

### Database Migrations Applied

| Migration | Purpose |
|---|---|
| `20260527000000_beta_hardening_error_tables` | Add `roster_upload_errors`, `alert_delivery_log` tables; add `needs_reverification` flag and `notification_email` column |
| `20260527010000_fix_delete_and_status_constraints` | Fix `switch_alerts` FK to CASCADE; expand `verification_status` CHECK |
| `20260527020000_fix_switch_alerts_schema` | Make `ghl_contact_id` nullable; expand `alert_type` CHECK; add `switch_type`, `detection_source`, `effective_date`, `detected_at` columns |
