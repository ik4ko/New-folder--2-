# Aegis Sage — Changelog

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
