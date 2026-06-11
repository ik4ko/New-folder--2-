# Aegis Sage — Changelog

## [Alerts UX: Crash Fix, Categories, Email Polish, Billing Permission] — 2026-06-11

- **Alerts page crash fixed** (`SOMETHING WENT WRONG` on /dashboard/alerts). The server page imported `getAlertTypology` from `components/alert-card.tsx`, a `'use client'` module — calling a client-exported function from a server component throws "Attempted to call ... from the server". Moved the typology logic to a server-safe `src/lib/alert-typology.ts`; alert-card re-exports it for backward compat. Server page now imports from the lib.
- **Sidebar alert badge corrected** (showed 1 while the dashboard tile said 5/6). The badge counted only `priority='critical'`; now counts ALL open/contacted alerts, matching the dashboard "require action" tile.
- **Alert categories relabeled to match the broker mental model.** Two buckets: **"Left Plan"** (already gone — `plan_changed`, `carrier_switch`, `termed`, `fully_disenrolled`) and **"Leaving Soon"** (scheduled/future — `future_plan_change`, `pending_switch`, `plan_switch`). With the live data (5 carrier switches + 1 termed) this correctly shows 6 under "Left Plan". "Leaving Soon" is the high-value pre-emptive bucket (a member scheduled to leave the plan you placed them on next month).
- **Email sender + subject lines.** From name is now `AegisSage <…>` (inboxes were showing the bare mailbox "alerts"). Subjects rewritten to lead with the category + action: "🚨 Left plan: NAME has no active Medicare coverage — immediate outreach needed", "⏳ Leaving soon: NAME is scheduled to switch plans on DATE — you can still save this client", etc.
- **Plan & Billing hidden from agency-employed brokers.** Settings nav now shows billing only to principals (owner/admin) and solo brokers (who pay their own plan). The billing page already renders a read-only "Seat Access" view for sub-brokers who reach it by URL.

## [Schema Sweep: Last Missing-Column Landmines Cleared] — 2026-06-10 (night)

Systematic sweep: extracted every column referenced in `.select()` against `book_of_business` and `switch_alerts` across the codebase and validated each against the live schema. Found and fixed the final three breakages of the missing-column class (PostgREST rejects an entire query when any selected column is unknown — pages render empty with no visible error):

- **Alert detail page** selected `date_of_birth, phone_primary` from `book_of_business` — neither exists (DOB is deliberately never stored plaintext). Dropped from the select; the member-info panel on alert details would otherwise never load.
- **Alerts list page + scripts page** selected `previous_carrier, new_carrier, estimated_revenue_at_risk` from `switch_alerts` — none existed, so THE ALERTS PAGE ITSELF would render empty even after alerts were inserted. Migration `20260610060000_add_switch_alerts_ui_columns` (applied to production) adds all three; the UI already null-coalesces them. Verified the full alerts-page select runs clean against live.

## [Critical Fix: MARx 404 Round 2 + Agency Dashboard Downgrade] — 2026-06-10 (night)

- **MARx verify STILL 404'd after the deploy — second missing-column bug found.** `BOB_SELECT` includes `enrollment_confirmed`, and the update payload writes `detection_status`, `detection_status_updated_at`, `enrollment_confirmed_at` — none existed in `book_of_business`. PostgREST rejects the whole SELECT on any unknown column, so every member lookup failed exactly like the dropped-mbi bug. Migration `20260610050000_add_marx_verify_missing_columns` (applied to production) adds all four; verified the exact BOB_SELECT column list now returns rows against live data. Re-running the MARx search should now produce alerts + emails.
- **Agency owner saw a broker-style dashboard (no Team/agency pages).** The sidebar gates nav on `agencies.subscription_tier`; the owner's agency had `subscription_tier='broker'`, `included_seats=1` despite `role='agency_owner'` and `account_type='agency'` metadata. Root cause: `autoProvisionUser` (run by the dashboard whenever a profile looks incomplete) **hardcoded `subscription_tier: 'broker'`** for every from-scratch agency. Fixed: it now reads `user_metadata.account_type` and provisions `agency`/5 seats vs `broker`/1 seat accordingly. The live agency record was corrected directly (`subscription_tier='agency'`, `included_seats=5`, `seat_limit=999`).
- Verified clean: roster import (82 members, all with mbi_hash, correctly broker-assigned), extension key auth, encryptMbi/decryptCredential are a compatible AES-256-GCM pair.

## [Extension Connect Rework: ID-Independent Pairing] — 2026-06-10 (later)

The connect flow had two real failure modes, both fixed:
- **Hardcoded extension ID**: the connect page messaged a fixed `EXT_ID` (`lficmpbig…`). Unpacked installs (the only option while the Web Store listing is pending) get a *random* ID, so the direct `chrome.runtime.sendMessage(EXT_ID, …)` path always failed and silently fell through.
- **Timing bug in the fallback**: the old bridge only read the token from `localStorage` once, at injection. Clicking "Connect" after the page had loaded set `localStorage` but dispatched a `CustomEvent` nothing listened for — so the token was never relayed and the connect silently did nothing.

New design — `postMessage` handshake, no ID dependency:
- `extension/connect-bridge.js` rewritten: announces `AEGISSAGE_EXT_PRESENT` on load and in reply to the page's `AEGISSAGE_PING`; listens for `AEGISSAGE_TOKEN` and acks `AEGISSAGE_TOKEN_STORED` after the background stores it. A content script can always reach its own background regardless of extension ID.
- `src/app/extension/connect/page.tsx`: detects the extension via the presence announcement (shows a live "Extension detected" / "not detected yet" indicator), sends the token via `postMessage`, and waits for the ack with a 4s timeout before falling back to the install instructions. `localStorage` retained as a secondary path. Hardcoded `EXT_ID` removed.
- `extension/manifest.json` bumped to 1.1.0; `public/aegissage-extension.zip` + root zip rebuilt with the new bridge. **Users must reload the unpacked extension** (chrome://extensions → reload) to pick up the new bridge.

## [Critical Fix: Account Provisioning Restored] — 2026-06-10 (later)

- **"Complete Account Setup" error on login/signup — ROOT CAUSE found and fixed.** `agencies.subscription_tier` had a column DEFAULT of `'solo'`, which is NOT in the `agencies_subscription_tier_check` allowed set (`trial, beta, broker, agency, enterprise`). `provisionAgency`'s core insert omits `subscription_tier`, so the invalid default applied and the INSERT failed with a CHECK violation every time — making the server action throw, surfaced to users as the masked "An error occurred in the Server Components render" on the setup page. ANY new or re-provisioned account hit this.
  - **DB fix (applied to production)**: `20260610040000_fix_agencies_subscription_tier_default.sql` sets the default to `'trial'`. Verified by replaying the exact provisioning insert sequence in a rolled-back transaction — all four steps (agency insert → tier update → broker insert → role update) now succeed.
  - **Code hardening**: `provisionAgency` now sets `subscription_tier: 'trial'` explicitly in the initial insert so it never again depends on the column default.
- Confirmed RLS is intact after the perf migration: an authenticated owner can SELECT their own agency row (simulated under `role authenticated` + JWT claims). The setup overlay was correct behavior for accounts whose profile was wiped by the earlier deletions (`ika9191@`, `erekleniniashvili@` have no agency/broker); it errored only because provisioning itself was broken.

## [Security Audit: Credential-Leak Endpoint Removed, Service Client Hardened] — 2026-06-10

- **CRITICAL — deleted `src/pages/api/carrier/get-credentials.ts`**: a GET endpoint with ZERO authentication that accepted `?agency_id=<uuid>` and returned **decrypted carrier portal passwords** (username + plaintext password) for any agency. On a public-repo deployment this was a full cross-tenant credential exfiltration vector. Confirmed zero callers anywhere in the codebase before removing.
- **Service-role client hardened (`src/lib/supabase/service.ts`)**: added a module-eval guard that throws if imported in a browser context, plus a missing-key guard. The service-role key bypasses RLS; this makes a client-bundle leak fail loudly at build/eval instead of silently shipping.
- **Removed dangling `createServiceClient` import from a client component** (`settings/carriers/verify/[carrier]/mfa-verify-form.tsx`) — it was imported but never called (the form correctly POSTs to the authed `/api/carriers/submit-mfa`). Not a live key leak (`SUPABASE_SERVICE_ROLE_KEY` lacks the `NEXT_PUBLIC_` prefix so Next never inlined it) but a footgun now eliminated and prevented by the guard above.

### Audited clean (no change needed)
- All `/api/scheduler/*` routes gate on `CRON_SECRET`; `/api/extension/*` and `/api/marx/*` gate on `extension_api_key` Bearer; Stripe webhook verifies HMAC signature; audit alert-receiver checks `x-supabase-webhook-secret`; admin routes gate on `ADMIN_API_SECRET`/`ADMIN_ENABLED`.
- No real secrets in tracked files or git history — only documentation placeholders (`sk_live_xxxxx`, `YOUR_API_KEY_HERE`). No `NEXT_PUBLIC_` secret misuse. Extension bundle carries no hardcoded keys.

## [Fix: Broker Book Navigation + Merge Reconciliation] — 2026-06-10 (later)

- **Owner clicking a broker's "View Book" landed on the agency-wide default view**: the dashboard team table links `/dashboard/book?broker_id=<id>`, but the book page only ever read `view=my_book` and silently ignored `broker_id`. The page now resolves `broker_id` for staff/owners (validated against the caller's agency — never cross-tenant), filters members and the open-alert count to that broker, and shows "· <Name>'s Book" in the header.
- **Merge**: reconciled local history with the externally-pushed `569f73d` ("Fable 5", settings-only change) — the 2026-06-10 fix/perf commits were not in that push because it was made from a different clone.

## [Performance: RLS InitPlan Rewrite + FK Index Sweep] — 2026-06-10

### Migration `20260610030000_performance_rls_initplan_and_fk_indexes.sql` (applied to production)
- **26 RLS policies rewrote `auth.uid()`/`auth.role()` per row** (advisor `auth_rls_initplan`) across 14 tables including the hot path (`brokers`, `agencies`, `book_of_business`, `switch_alerts`). All wrapped in `(select auth.*())` so Postgres evaluates once per query — mechanical, semantics-preserving rewrite generated from `pg_policy` and reviewed before apply. Verified post-apply: zero bare `auth.*()` calls remain in public policies.
- **45 unindexed FK columns indexed** (advisor `unindexed_foreign_keys`): every `agency_id`/`broker_id` tenant-scope column plus attribution and join FKs. agency_id columns sit inside every RLS subquery; child-side FK indexes also keep cascade deletes (member/agency) off seq scans.
- **2 duplicate indexes dropped** (`idx_carrier_baselines_lookup`, `idx_carrier_schema_maps_fingerprint`) — both shadowed identical UNIQUE-constraint indexes.
- **Accepted residual**: multiple-permissive-policy pairs (broker_own vs agency_staff) on 7 tables — deliberate role-split, not merged; auth./storage. schema duplicates — Supabase-managed.

## [Critical Fix: MARx Verify 404 + Alert Pipeline, Account Deletion Unblocked] — 2026-06-10

### MARx verify route was 100% broken (`src/app/api/marx/verify/route.ts`)
Vercel logs showed every `POST /api/marx/verify` returning 404 (33/33 members on the 2026-06-10 02:33 UTC run). Three stacked bugs:

- **Root cause 1 — dead `mbi` select (the 404)**: `BOB_SELECT` still included the plaintext `mbi` column dropped by `20260607000000_mbi_encryption`. PostgREST rejects the entire select, so BOTH member lookups (by id and by `mbi_hash`) failed and every call returned "Member not found". This was the 7th dead-mbi select; yesterday's sweep caught the other six. `last_marx_check` was stamped by bulk-check (200), which made the run look like "all verified, nothing detected".
- **Root cause 2 — alert insert used 4 nonexistent columns**: payload wrote `member_id` / `previous_plan` / `detected_plan` / `details` — none exist on `switch_alerts`. Every detected switch would have failed to insert, with the error visible only in Vercel logs. Rewritten to the live schema (`bob_member_id`, `previous_plan_code`, `new_plan_code`, `new_plan_name`, `previous_value`, `new_value`, `carrier`, `switch_type`, `detection_source: 'marx_extension'`, `detected_at`, `status: 'open'`, `effective_date` when parseable). The 24h dedup query had the same dead `member_id` filter (error silently discarded) — fixed and error now logged.
- **Root cause 3 — magic-detection alert types violated CHECK constraint**: `FUTURE_CHURN` / `LOST_MEMBER` / `LAPSED_COVERAGE` were written raw into `alert_type`, which the CHECK constraint rejects. Now mapped: FUTURE_CHURN → `pending_switch`, LOST_MEMBER → `plan_switch`, LAPSED_COVERAGE → `termed`; the original message is preserved in `new_value`.
- **Email dispatch hardening**: inline email now sends only when the alert row was actually inserted (no more emails about alerts that don't exist in the dashboard); on confirmed send, `notified_at` + `notification_email` are stamped so the notifications cron doesn't double-send; on failure `notified_at` stays NULL and the cron retries.

### Account deletion unblocked (DB migrations, applied to production)
- `20260610010000_audit_log_detach_fks_for_retention` — `audit_log.agency_id` had `ON DELETE CASCADE` into a table whose `audit_log_no_delete` trigger forbids ALL deletes (HIPAA immutability) → every agency/account deletion aborted with P0001 (user-reported screenshot). `audit_log.user_id` FK (NO ACTION) likewise blocked auth-user deletion. Both FKs dropped — audit rows must outlive their principals per HIPAA retention; columns remain as plain uuids, immutability trigger unchanged. Indexes added on both columns.
- `20260610020000_user_attribution_fks_set_null` — ten "who did it" FKs to `auth.users` (invited_by, submitted_by ×2, synced_by, csr_id, assigned_broker_id, resolved_by ×2, acknowledged_by, uploaded_by) converted from NO ACTION to `ON DELETE SET NULL`; NOT NULL dropped on the three compliance-artifact columns. Deleting a user no longer FK-blocks; their records survive with actor cleared.
- Deletion chain verified: auth user → agencies CASCADE → brokers/members CASCADE; audit_log retained. NOTE: deleting an agency OWNER's auth user deletes the whole agency (pre-existing `agencies.owner_id ON DELETE CASCADE`) — intended, but don't do it to a live customer.

## [Security: Seat-Count Function Lockdown] — 2026-06-10

### Migration `20260610000000_lock_seat_count_functions.sql` (applied to production)
- **`get_active_seat_count(uuid)` / `get_seat_overage(uuid)`**: were SECURITY DEFINER and executable by any signed-in user via `/rest/v1/rpc` with an arbitrary `agency_id` — a cross-tenant leak of agency headcount and seat-overage status (Supabase advisor 0029). EXECUTE revoked from `PUBLIC`, `anon`, `authenticated`; granted only to `service_role`. Safe because the sole caller is the `enforce_broker_seat_limit` trigger function, itself SECURITY DEFINER owned by `postgres`, so nested EXECUTE checks resolve against `postgres` — seat enforcement unaffected (verified via `has_function_privilege` matrix post-apply).
- **`get_my_agency_id()` / `get_user_agency_id()`**: `anon` + `PUBLIC` revoked; `authenticated` intentionally retained — they take no parameters, derive strictly from `auth.uid()`, and RLS policies check EXECUTE against the querying role. The remaining advisor WARN on these two is accepted residual, documented in the migration header.
- **Verified post-apply**: advisor re-run shows both arbitrary-input findings cleared; remaining items are the two intentional identity helpers, two INFO-level deny-by-default service tables (`background_job_queue`, `carrier_schema_history`), and the leaked-password-protection Auth toggle (dashboard-only setting, flagged to owner).

### Investigation notes (no code change)
- **`ghl_contacts` plaintext PHI caveat from 2026-06-09 handoff is moot**: live schema holds only `mbi_enc`/`dob_enc`/`phone_enc` (jsonb) + `mbi_hash`; the 2026-05-16 migration added only name/email/phone (non-PHI). Table currently has 0 rows.
- **Campaigns → GHL outbound writes confirmed intentional** (owner decision 2026-06-10): GHL sync stays inbound-only, but campaign tag/pipeline writes remain to trigger client-side GHL workflows.
- **Migration ledger drift noted**: production ledger (67 entries) diverges from repo files (54) — MCP-applied migrations received new version stamps and several ad-hoc data fixes were never committed. Reconciliation deferred.


## [Security & Compliance Hardening: PHI Log Purge, Auth Fix, Error Trails, Dedup Migration] — 2026-05-28

### Part 1 — PHI Log Purge (`src/app/api/extension/sync/route.ts`)
Removed four PHI-leaking `console.log` statements identified in the friction & compliance audit:
- **Removed** `console.log('[sync] row0:', ...)` — was dumping the first raw member row (name, MBI, plan) to Vercel logs on every extension sync, truncated to 500 chars which still fit a full MBI and name.
- **Removed** `console.log('[HF] Full row0:', ...)` and `'[HF] All keys in row0:'` — Healthfirst-specific debug block that logged the **complete** first portal row with zero truncation.
- **Removed** `console.log('[sync] normalizeRow name debug...')` — fired **per row** inside the processing loop, printing member first name, last name, and assembled full name on every iteration. A 200-member sync produced 200 name lines in Vercel logs.
- **Removed** `console.log('[sync] Good news: ${m.full_name}...')` — logged member full name on every re-enrollment detection event.
- **Retained** the PHI-safe metadata line: `console.log('[sync] carrier:', carrier, '| row_count:', n, '| col_count:', n)` — operational context only, zero member data.
- **Replaced** re-appearance log with: `console.log('[sync] member re-appeared on ${carrier} roster — bob_id: ${m.id}')` — UUID only.

### Part 2 — GHL Sync Auth Hardening (`src/app/api/ghl/sync/route.ts`)
- **Replaced `supabase.auth.getSession()` with `supabase.auth.getUser()`** in the POST handler. `getSession()` reads the JWT from the cookie without server-side validation — vulnerable to replayed or tampered tokens. `getUser()` performs a live validation request against the Supabase Auth server, guaranteeing the session is current and untampered. Threaded `user.id` (from `getUser`) through the broker lookup replacing the previous `session.user.id` reference.

### Part 3 — GHL Token null guard + error sanitization (`src/app/api/ghl/sync/route.ts`)
- **`expires_at` null guard added:** `getValidToken()` previously computed `new Date(cred.expires_at ?? 0).getTime()`, falling back to the Unix epoch (0) when `expires_at` was null. This made `needsRefresh` always `true` for any agency row with a null expiry, forcing a GHL token refresh network call on **every sync invocation**. Now throws a clean `'GHL token missing expiry — please reconnect'` error, sending the user through the OAuth flow once to obtain a properly-stamped token.
- **Token refresh error sanitized:** `throw new Error('GHL token refresh failed: ' + await res.text())` was interpolating the raw GHL API error response body (which may contain OAuth debugging details) directly into the thrown message, which propagates to Vercel logs and potentially to the client JSON response. Now: reads the body once, logs only the first 200 chars to `console.error` (server-only), and throws a clean user-facing message: `'GHL token refresh failed (HTTP ${status}) — please reconnect via the GHL page'`.

### Part 4 — Google Sheets import error trail (`src/app/api/roster/sheets-import/route.ts`)
- **Row loop refactored from `for...of` to indexed `for` loop** so each dropped row's 1-based spreadsheet row number can be captured accurately (`rowIdx + 2` = 1-based + header row).
- **`rejectedRows` array added** — mirrors the exact same structure as `/api/roster/upload`: captures `row_index`, `reason` (with the raw MBI value if present, or a clear "empty/unresolvable" message), and `raw_data` (full column snapshot keyed by header name).
- **`roster_upload_errors` write added** — after a successful upsert, all rejected rows are persisted with `upload_source: 'sheets_import'` so they appear in the broker's error review trail alongside file-upload rejections. Write is non-fatal (errors logged, not surfaced to the user).
- **Response enriched** — now includes `rejectedCount` and `message_errors` alongside the existing `imported`, `dropped`, `mbiCount`, `planCount`, `carrierCount` fields, consistent with the upload route's response shape.

### Part 5 — Deduplication migration (`supabase/migrations/20260528060000_bob_mbi_agency_unique.sql`)
- **`UNIQUE(mbi, agency_id)` constraint added to `book_of_business`** — named `bob_mbi_agency_unique`. Without this, both import routes' `.upsert(records, { onConflict: 'mbi,agency_id' })` calls had no conflict target to match against, causing every re-import of the same roster or Google Sheet to INSERT duplicate rows instead of updating the existing member record.
- **Pre-constraint deduplication:** The migration's `BEGIN` block runs a `DELETE ... WHERE rn > 1` window function first — for any live database that already has duplicate `(mbi, agency_id)` rows from pre-fix imports, this removes the older copies (keeping the most recently `updated_at` row) before adding the constraint. Safe no-op on a clean database.
- **Existing `UNIQUE(broker_id, carrier, member_id)` constraint preserved** — untouched. Both constraints coexist.
- **Partial index added:** `idx_bob_mbi_agency_lookup WHERE mbi IS NOT NULL` — accelerates the verify route and MARx check pattern `WHERE mbi = $1 AND agency_id = $2` without indexing null-MBI rows.
- Entire migration is wrapped in `BEGIN / COMMIT` — rolls back atomically if any step fails.

---

## [Operational Sovereignty: Edge-Mapping Engine, Compliance Audit Trail, Revenue Calculator] — 2026-05-28

### Migration: `20260528040000_carrier_edge_maps.sql` — Autonomous Carrier Edge-Mapping Engine

New table `public.carrier_edge_maps` stores server-delivered CSS/DOM selectors for the Chrome extension. This eliminates the structural vulnerability where a carrier portal DOM update (Humana button layout change, Aetna table restructure, etc.) would silently break extension extraction until a Chrome Web Store review cycle completed.

**Architecture:**
- Extension calls `GET /api/edge-mapping` (authenticated via `extension_api_key`) on startup and every 15 minutes
- Server returns the active selector set for all carriers (or one specific carrier via `?carrier=humana`)
- Extension caches selectors locally with a `version` integer for cache invalidation — sends `?version=N` and receives `304 Not Modified` when nothing changed
- `version` auto-increments on every row UPDATE via a `BEFORE UPDATE` trigger. Updating a selector in Supabase Studio instantly propagates to all live extension installs on next fetch cycle.
- `fallback_selectors` JSONB column stores hardcoded fallback values per carrier — extension falls back gracefully if the API is unreachable

**Seeded carriers:** humana, uhc, aetna, wellcare, bcbs, devoted — with extraction_strategy typed as css / aria / xpath / text.

**RLS:** `SELECT` open to any authenticated session (extension API key resolves to a broker session). `INSERT/UPDATE/DELETE` requires service role — no broker can modify selectors.

**Table columns:** `carrier_slug` (UNIQUE), `carrier_display`, `portal_base_url`, `mbi_selector`, `roster_row_selector`, `name_selector`, `plan_selector`, `status_selector`, `effective_date_selector`, `search_input_selector`, `search_button_selector`, `extraction_strategy`, `version`, `is_active`, `fallback_enabled`, `fallback_selectors`, `last_verified_at`, `verified_by`, `notes`.

---

### API Route: `src/app/api/edge-mapping/route.ts`

**`GET /api/edge-mapping`**
- Auth: `Authorization: Bearer <extension_api_key>` (same pattern as `/api/extension/sync`)
- Query params: `?carrier=humana` (filter), `?version=N` (cache check → 304 if no changes)
- Response: `{ maps: CarrierEdgeMap[], fetched_at, ttl_seconds, max_version }`
- Headers: `Cache-Control: private, max-age=900`, `X-Edge-Map-Version`
- Every fetch logged to `enterprise_audit_logs` with `action_type: 'EDGE_MAP_FETCH'`

**`POST /api/edge-mapping`** (field verification reporting)
- Extension reports whether selectors still work against the live portal
- Body: `{ carrier_slug, verified: boolean, broken_selectors?: string[], notes?: string }`
- Updates `last_verified_at` and appends broken selector report to `notes` column

---

### Migration: `20260528050000_enterprise_audit_logs.sql` — HIPAA Compliance Audit Trail

New table `public.enterprise_audit_logs` — purpose-built HIPAA §164.312(b) compliance audit log. Supplements (does not replace) the existing general-purpose `audit_log` table.

**Key differences from `audit_log`:**
- `client_ip` + `user_agent` + `session_id` columns (required by HIPAA for access audit)
- `phi_touched BOOLEAN` — fast triage flag for breach assessment (filter WHERE phi_touched = TRUE)
- `action_type TEXT CHECK(...)` — enum constraint preventing arbitrary string pollution
- **Append-only enforced at SQL rule level** — `CREATE RULE ... DO INSTEAD NOTHING` blocks UPDATE and DELETE even from the service role. True immutability without triggers.

**Action types:**
- PHI-touch: `MBI_REVEAL`, `MBI_COPY`, `CSV_EXPORT`, `RECORD_MODIFY`, `RECORD_DELETE`, `RECORD_VIEW`
- Infrastructure: `EDGE_MAP_FETCH`, `API_KEY_GENERATE`, `ROSTER_UPLOAD`, `ALERT_ACKNOWLEDGE`, `CRM_SYNC`
- Auth: `LOGIN`, `LOGOUT`, `LOGIN_FAILED`

**RLS:** OWNER + MANAGER/CS can SELECT (audit report access). Agency members can INSERT. No UPDATE/DELETE policy (blocked at SQL rule level regardless).

**Indexes:** `idx_eal_agency_phi` (partial, WHERE phi_touched = TRUE) — primary compliance query path. `idx_eal_user_timeline` — breach investigation. `idx_eal_action_type` — action filter. `idx_eal_resource` — "who accessed member X" lookup.

---

### Library: `src/lib/audit/log-enterprise-event.ts`

Server-side audit helper callable from any API route or server action.

**`logEnterpriseEvent(params)`** — core function. Uses service role client. Failures are silently swallowed (audit failures must not disrupt primary operations). Automatically forces `phi_touched = true` for `MBI_REVEAL`, `MBI_COPY`, `CSV_EXPORT`, `RECORD_MODIFY`, `RECORD_DELETE`.

**Convenience wrappers:** `logMbiReveal()`, `logMbiCopy()`, `logCsvExport()`, `logRosterUpload()`, `logCrmSync()` — pre-typed for the most common event patterns.

**PHI policy enforced:** jsdoc and parameter naming explicitly prohibit passing raw PHI (names, MBI values) in `metadata`. Only `resourceId` (UUID) is acceptable for identifying records.

---

### API Route: `src/app/api/audit/phi-touch/route.ts`

Client-side PHI-touch event endpoint for browser-initiated events that cannot be captured server-side.

- Auth: Supabase session cookie (JWT). `agencyId` and `userId` resolved from the authenticated session — **never from the request body**.
- `clientIp` from `x-forwarded-for` header — never from body.
- `metadata` sanitized: strips any key matching `/mbi|ssn|hicn|medicare|dob|birth|phone|address|name|email/i`
- Allowed action types from client: `MBI_REVEAL`, `MBI_COPY`, `CSV_EXPORT`, `RECORD_VIEW`, `ALERT_ACKNOWLEDGE`
- Returns `204 No Content` immediately — write is fire-and-forget, never blocks the UI

**Integration points (where to call from book-member-table.tsx):**
```typescript
// On MBI overlay open:
fetch('/api/audit/phi-touch', { method: 'POST', body: JSON.stringify({ actionType: 'MBI_REVEAL', resourceId: member.id }) })
// On MBI copy click:
fetch('/api/audit/phi-touch', { method: 'POST', body: JSON.stringify({ actionType: 'MBI_COPY', resourceId: member.id }) })
// On CSV export:
fetch('/api/audit/phi-touch', { method: 'POST', body: JSON.stringify({ actionType: 'CSV_EXPORT', metadata: { row_count: filtered.length } }) })
```

---

### Component: `src/components/revenue-leakage-calculator.tsx` — Agency Revenue Leakage Calculator

Dashboard panel for Agency Owner view showing the exact annualized commission revenue at risk from CRITICAL_PENDING member switches. Slotted into `src/app/dashboard/page.tsx` directly above the Alert Summary Widget — only renders when `switchingAlerts > 0 || termedAlerts > 0`.

**Calculation model:**
- `switchingLoss = switchingCount × $600/member/yr` — CRITICAL_PENDING switches (100% loss risk)
- `termedLoss = termedCount × $600 × 0.5` — Termed members (50% recovery possible via SEP/OEP re-enrollment)
- `totalAnnualLoss = switchingLoss + termedLoss`
- `monthlyImpact = totalAnnualLoss ÷ 12`
- `atRiskPercent = (switchingCount + termedCount) ÷ totalCount × 100`

**Visual spec:**
- Uses `bg-[hsl(var(--surface-1))]` and `bg-[hsl(var(--surface-2))]` CSS tokens — not hardcoded slate
- Amber (`text-amber-300`, `border-amber-500/25`) for CRITICAL_PENDING (recoverable)
- Red (`text-red-400`) for termed (harder to recover)
- Primary figure displayed as `$X,XXX / Year` in 4xl–5xl font-black tabular-nums
- Secondary display: `≈ $X,XXX/mo`
- Zero-loss state: renders emerald "No Detected Revenue Risk" health card instead

**CTAs:** "Review & Recover" → `/dashboard/alerts`, "File VCC Forms" → `/dashboard/vcc`

---

## [Enterprise Design System: AegisMessage, Typography, Dark Mode Unification] — 2026-05-28

### New: `src/components/ui/aegis-message.tsx` — AegisMessage System Notification Component
Premium platform-wide notification component for all system, compliance, and retention communications. Replaces ad-hoc inline alerts across the dashboard.

**Three alert tiers:**
- `INFO` — Blue primary accent. Shield badge. Routine system announcements, feature updates, onboarding tips.
- `COMPLIANCE_WARNING` — Amber `--warning` token. ShieldCheck icon. HIPAA reminders, carrier deadline notices, regulatory updates. Amber border-left, amber glow background.
- `CRITICAL_RETENTION` — Red. ShieldAlert icon. Active member loss risk, CRITICAL_PENDING plan switches. Animated pulse ring on the shield badge.

**Props API:**
- `type` — `'INFO' | 'COMPLIANCE_WARNING' | 'CRITICAL_RETENTION'`
- `title` — Headline (5–10 words ideal)
- `body` — Message body (1–3 sentences)
- `timestamp` — ISO or pre-formatted label, displayed with Clock icon
- `actionLabel` + `onAction` — Optional CTA button, right-aligned
- `deadline` — Optional deadline label (left-aligned next to CTA)
- `pulse` — Auto-true for CRITICAL_RETENTION; shows animated ring on shield

**Convenience wrappers:** `InfoMessage`, `ComplianceWarning`, `CriticalRetentionAlert` (type pre-filled).

**Stack wrapper:** `AegisMessageStack` — renders an ordered list of messages with consistent `space-y-2.5` gaps.

**Accessibility:** `role="alert"`, `aria-live="assertive"` for CRITICAL_RETENTION, `aria-live="polite"` for others.

---

### `src/app/globals.css` — Enterprise Typography & Color System Overhaul

**New CSS tokens (`:root` + `.dark`):**
- `--warning` / `--warning-foreground` — Amber-500 equivalent. **Exclusively reserved for CRITICAL_PENDING retention alerts.** Prevents amber creeping into non-critical UI states.
- `--surface-1` / `--surface-2` / `--surface-3` — Three-stop elevation depth system for dark mode cards. Replaces the 2% lightness-difference card/background that was nearly imperceptible.
  - `surface-1`: base card floor (`222 47% 6%`)
  - `surface-2`: raised card / hover state (`222 47% 9%`)
  - `surface-3`: floating panel / modal tier (`222 40% 13%`)
- `--sidebar-background`: Moved to a dedicated token (`220 47% 3%`) — one lightness stop below `--background` to create clear visual separation between sidebar and content pane.

**Typography upgrades:**
- `font-variant-numeric: tabular-nums` + `font-feature-settings: "tnum"` applied via `.data-cell` utility — makes MBIs, NPNs, phone numbers, and dates render in consistent column widths.
- `.identifier` utility class — monospace font stack (JetBrains Mono → Fira Mono → ui-monospace) with `letter-spacing: 0.04em` for credentials.
- `th` global rule adds `white-space: nowrap` preventing column headers from collapsing into multi-line blocks in dense data tables.
- `.data-table` component class enforces all table header standards in one declaration.
- `letter-spacing: -0.015em` on `.dark` headings for tighter, more premium titling.

**Scrollbar refinement:**
- Custom 4px dark scrollbar in `.dark` contexts — `slate-700/60` thumb, transparent track. Consistent with the "invisible chrome" enterprise aesthetic.

**New animation:**
- `fade-up` keyframe (`opacity 0 → 1`, `translateY 6px → 0`, 0.3s ease-out) — for page-level content reveal.
- `critical-ring` keyframe — box-shadow pulse for CRITICAL_RETENTION alerts.

**Global transition fix:**
- Changed `transition-colors` global rule to explicit `transition-property: color, background-color, border-color, opacity, box-shadow` with `duration: 150ms`. Prevents the `transition-colors` rule from inadvertently animating layout properties (width, padding) on sidebar open/close.

---

### `tailwind.config.ts` — Design Token Extensions

- **Font families updated**: `body` / `headline` extended to full system-ui fallback chain. `mono` / `code` now use JetBrains Mono → Fira Mono → ui-monospace stack.
- **New color tokens**: `warning.DEFAULT` / `warning.foreground`, `surface.1` / `surface.2` / `surface.3` — all mapped to CSS variables.
- **Border radius additions**: `3xl` (1.75rem), `4xl` (2rem) for future modal/sheet surfaces.

---

### `src/components/sidebar-nav.tsx` — Token-Driven Surface Unification

- **`bg-slate-950` → `bg-[hsl(var(--sidebar-background))]`** — sidebar now reads from the CSS token system, not a hardcoded Tailwind slate.
- **`border-white/10` → `border-[hsl(var(--sidebar-border))]`** — all sidebar dividers token-driven.
- **Active nav link**: Upgraded from `bg-primary/10` flat fill to `bg-primary/[0.12]` + inset top highlight `shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]` + `border border-primary/20`. Matches premium glass-morphism depth.
- **Inactive nav hover**: Changed from `hover:bg-white/5` (nearly invisible) to `hover:bg-[hsl(var(--sidebar-accent))]` — a deliberate, legible hover state.
- **User profile dropdown**: Background changed from `bg-slate-900` to `bg-[hsl(var(--surface-3))]` — uses the elevation system.
- **CMS disclaimer text**: Copy fixed to "Not affiliated with or endorsed by" (was "Not connected with").

### `src/components/app-layout-shell.tsx` — Layout Cohesion

- All shell surfaces changed from raw `bg-background` / `bg-card` to use `antialiased` consistently.
- Mobile header changed from `bg-card` to `bg-[hsl(var(--sidebar-background))]` — visually matches the sidebar on mobile, instead of the brighter card surface.

---

## [Security Architecture: Broker-Isolated RLS, CRITICAL_PENDING Alerts, MBI Masking] — 2026-05-28

### Migration: `20260528030000_broker_isolated_rls.sql`
Complete rewrite of the three core data-access policies (`bob_agency_access`, `alerts_agency_access`, `contacts_agency_access`) — all of which previously granted every agency member (brokers included) full table access with zero isolation. Replaced with a tiered RBAC policy set:

**Role isolation rules implemented:**
- **BROKER** (`broker` / `solo_broker` role): `SELECT` restricted to records where their own `broker_id` (book_of_business, switch_alerts) or `assigned_broker_id` (ghl_contacts) matches. Cannot see peer broker data.
- **MANAGER** (`agency_admin` role): Broad `SELECT` across all agency records. Can `UPDATE` alerts and BOB records. Cannot mutate billing columns.
- **CS** (`customer_service` role): Same read breadth as MANAGER for monitoring/support. Cannot mutate core records.
- **OWNER** (`agencies.owner_id`): Full `ALL` access via `agencies_owner_all` policy. Exclusive `UPDATE` rights to `agencies` table (subscription_tier, stripe_customer_id, seat_limit).
- **OWNER does NOT consume a broker seat** — isolation is via `agencies.owner_id` path, separate from the `brokers` table.

**CRITICAL_PENDING broadcast:**
- Alerts where `switch_alerts.effective_date > CURRENT_DATE` are broadcast to all agency members regardless of `broker_id` — implemented via `alerts_critical_pending_broadcast` policy.
- New view `critical_pending_alerts` created: joins `switch_alerts` with `book_of_business` for member name/plan context.

**Schema additions (idempotent `ADD COLUMN IF NOT EXISTS`):**
- `book_of_business`: `future_plan_name TEXT`, `future_effective_date DATE`, `future_plan_code TEXT`, `has_mbi BOOLEAN DEFAULT false`, `last_marx_check TIMESTAMPTZ`, `detected_plan_name TEXT`, `detected_carrier_name TEXT` — all were queried in the frontend but absent from all migration files.
- `switch_alerts`: `broker_id UUID REFERENCES brokers(id)` — denormalized for efficient row-level isolation without multi-table joins in RLS checks. Backfilled from `bob_member_id → book_of_business.broker_id`.

**Helper functions recreated:**
- `get_my_role(agency_id)` — returns role string for the calling user.
- `is_staff(agency_id)` — returns `true` for OWNER / MANAGER / CS.
- `is_owner(agency_id)` — returns `true` for OWNER only (new).

**Indexes added:**
- `idx_brokers_user_role(user_id, role)` — accelerates all role-check subqueries.
- `idx_agencies_owner_id(owner_id)` — accelerates owner-check subqueries.
- `idx_bob_broker_id(broker_id)` — accelerates broker isolation reads.
- `idx_ghl_contacts_assigned_broker(assigned_broker_id)` — accelerates broker contact isolation.
- `idx_switch_alerts_broker_id(broker_id)` — accelerates alert isolation.
- `idx_switch_alerts_critical_pending(agency_id, effective_date)` — accelerates critical pending broadcast query.

### MBI Visual Masking (`src/components/book-member-table.tsx`)
- **Table row MBI button** now displays `**-***-****` (monospace font) instead of plain "MBI" text when an MBI is on file. Color remains emerald (present) vs. red (missing).
- Button tooltip added: "Click to reveal & copy MBI" / "Click to enter MBI".
- **Overlay modal unchanged** — still displays the raw unmasked MBI with copy-to-clipboard. Masking is purely visual at the row level.
- When no MBI is set, button now reads "Add MBI" (was "MBI") for clearer affordance.

---

## [Marketing Overhaul: Tier Separation, Compliance Pages, Billing-v2 Sandbox] — 2026-05-28

### Landing Page (`src/app/page.tsx`) — Full Overhaul
- **Pricing updated**: Broker $79 → **$149/mo** (annual: $119). Agency $497 → **$749/mo base + $49/broker seat** (annual: $599 + $39/seat).
- **Agency CTA changed**: "Start Free Trial" → **"Request Enterprise Onboarding & Security Docs"** — opens `EnterpriseModal` lead-capture form (no backend wiring yet; logs payload to console for beta inspection).
- **Two-Tier Experience section added** (`#tiers`): Distinct visual housing for Independent Broker (slate/speed theme, live book preview) vs Agency Owner (primary/enterprise theme, Manager Control Center preview with downline broker table). Completely separate visual identities.
- **Annual billing toggle** added to pricing section — switches all displayed prices live with no page reload.
- **Enterprise trust microbar** added to hero: HIPAA / AES-256 / BAA / Not Affiliated with CMS.
- **Compliance trust grid** added below pricing cards: 4 pillars (HIPAA, AES-256, BAA, SOC 2 Aligned).
- **Footer overhauled**: Full 4-column layout (brand, platform links, legal links). New legal links: `/privacy-policy`, `/terms-of-service`, `/security-compliance`, `/baa`.
- All "Start Free Trial" flows for broker tier preserved. Agency tier removed from free trial entirely — gated behind enterprise inquiry modal.

### New Compliance Pages
- **`/privacy-policy`** (`src/app/privacy-policy/page.tsx`): Healthcare-grade data minimization statement. Covers: data collected, HIPAA/BAA, data minimization principle, retention schedule, agent rights, sub-processor list (Supabase/AWS, Vercel, SendGrid, Stripe).
- **`/terms-of-service`** (`src/app/terms-of-service/page.tsx`): Full service agreement. Covers: acceptance, subscription tiers ($149/$749), **annual commitment policy for Agency Plan (non-cancellable mid-term)**, cancellation/refund policy, permitted use restrictions, limitation of liability (not affiliated with CMS), modification terms.
- **`/security-compliance`** (`src/app/security-compliance/page.tsx`): AES-256 architecture detail, TLS 1.3 in-transit, AWS/Supabase HIPAA-eligible hosting, RBAC + audit logging, API/extension authentication (JWT + hex key), BAA availability. Includes direct compliance@aegissage.com CTA.

### Billing-v2 Sandbox (`src/components/billing-v2/`)
- **`pricing-sandbox.tsx`**: Fully isolated pricing UI for new tiers. Includes monthly/annual toggle, per-broker seat calculator (live price math), Stripe product ID stubs (`SANDBOX_*`), and `onCheckout` callback prop (logs payload to console only — no live API calls). Import this ONLY for internal demos — not referenced by any active route.

## [Beta Cleanup: Code Hygiene, Dead Routes, UX Hardening] — 2026-05-28

### Dead Routes Neutered (17 pages → redirect stubs)
- `/dashboard/upload` → `/dashboard/churn/upload`
- `/dashboard/members/[id]` → `/dashboard/book`
- `/dashboard/clients/[contactId]` → `/dashboard/book`
- `/clients/new`, `/clients/[id]`, `/members`, `/members/new`, `/members/[id]` → `/dashboard`
- `/accounting`, `/check-ins`, `/ai` → `/dashboard`
- `/dashboard/settings/crm` → `/settings/profile`
- `/settings/maya`, `/settings/security`, `/settings/compliance` → `/settings/profile`
- `/settings/team` → `/dashboard/team`
- `/careers` → `/`
- All converted to `redirect()` stubs — testers cannot reach broken legacy UI; Next.js handles gracefully.

### Unhandled Promise / useEffect Fixes
- `onboarding-checklist.tsx`: Converted `.then()` chain without `.catch()` to async/await wrapped in try/catch. Checklist now silently suppresses failures instead of throwing unhandled rejection noise in the console.
- `book-member-table.tsx`: `handleDelete`, `handleMarxCheck`, and `saveMbi` — all now check `res.ok` before proceeding, show toast on error, and have outer `catch` blocks for network failures. Previously `handleMarxCheck` always reloaded the page regardless of server response.
- `doctor-info-card.tsx`: Added outer `catch` block for network errors in `handleSave`.

### Loading State Hardening
- `doctor-info-card.tsx`: Save button now shows `Loader2` spinner while saving; inputs disabled during in-flight request to prevent double-submit.
- `book-member-table.tsx`: MARx check button and delete button both disable during pending operations with spinner state.
- `vcc/new/page.tsx`: Confirmed — submit button on Step 4 uses `disabled={isPending}` + `Loader2` spinner via `useTransition`. All 4 nav buttons properly guard state.
- All `alert()` calls replaced with `useToast` — no more browser dialogs breaking the tester flow.

### Console.log Cleanup
- Removed `console.log("Auth Attempt [Signup]:", data.email)` from `signup/page.tsx` — was leaking user email (PII) to the browser console on every signup attempt.
- Removed misleading `console.log('Mock GHL Sync triggered for', phone)` from `crm_sync.ts` — the "Mock" label was confusing; the code path is real and routes to GHL via API key.
- All remaining `console.error` / `console.warn` logs are in server-side API routes only — intentional for Vercel runtime log visibility during beta debugging.

---

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
