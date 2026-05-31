# AegisSage — Vercel Production Environment Variable Checklist

**Location:** Vercel Dashboard → Your Project → Settings → Environment Variables

Set each variable to **Production** environment (and optionally Preview/Development
where noted). Never commit real values to the repository.

---

## How to read this checklist

| Column | Meaning |
|--------|---------|
| **Variable** | Exact key name — copy-paste sensitive, case-sensitive |
| **Required** | `CRITICAL` = deployment fails or data is corrupted without it · `FEATURE` = a specific feature silently breaks · `OPTIONAL` = has a code-level fallback |
| **Where to get it** | Source of the value |

---

## 🔴 CRITICAL — Deployment fails or data corruption occurs without these

These variables are read at **server startup and request time with no fallback**.
A missing or incorrect value will cause 500 errors, failed auth, or — in the
case of `PHI_MASTER_SECRET` — unrecoverable encrypted data.

| Variable | Required | Where to get it | Notes |
|----------|----------|-----------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | CRITICAL | Supabase Dashboard → Project → Settings → API → Project URL | Must match your production Supabase project. Format: `https://xxxxxxxxxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | CRITICAL | Supabase Dashboard → Settings → API → `anon public` key | Safe to expose client-side. RLS policies are the security layer, not this key. |
| `SUPABASE_SERVICE_ROLE_KEY` | CRITICAL | Supabase Dashboard → Settings → API → `service_role secret` key | **Never expose to client.** Server-only. Bypasses RLS — used by all admin routes and the enterprise audit logger. Rotate immediately if compromised. |
| `PHI_MASTER_SECRET` | CRITICAL | Generate once: `openssl rand -hex 32` | **HIPAA-critical.** Used as the PBKDF2 root key for AES-256-GCM encryption of MBIs and GHL credentials (`crm_sync.ts`, `phi.ts`, `ingest.ts`). If this changes after data is written, all encrypted records become permanently unreadable. Store in a password manager and back up offline. Minimum 64 hex characters. |

---

## 🟠 GHL OAuth Integration — All 4 required for any GHL-connected agency

Missing any of these causes the GHL OAuth flow to fail at redirect or token
exchange. Every broker who tries to connect their GHL sub-account will hit a
500 error.

| Variable | Required | Where to get it | Notes |
|----------|----------|-----------------|-------|
| `GHL_CLIENT_ID` | CRITICAL | GHL Marketplace → Your App → OAuth → Client ID | The public identifier for your GHL marketplace app. |
| `GHL_CLIENT_SECRET` | CRITICAL | GHL Marketplace → Your App → OAuth → Client Secret | Server-only. Never expose client-side. Used in `/api/connect/callback` to exchange authorization codes for tokens. |
| `GHL_REDIRECT_URI` | CRITICAL | Must exactly match what's registered in GHL Marketplace | **Correct format: `https://www.aegissage.com/api/connect/callback`** — GHL bans "ghl" in redirect URIs; the old `/api/ghl/callback` path causes OAuth rejection. The code auto-corrects a stale value at runtime, but update this env var to remove the server warning. |
| `GHL_STATE_SECRET` | FEATURE | Generate: `openssl rand -hex 32` | HMAC signing key for OAuth state parameter (CSRF protection in `/api/connect/callback`). Falls back to `NEXTAUTH_SECRET` if missing — set this independently. |

---

## 🟠 Email — Required for all alert notification emails

| Variable | Required | Where to get it | Notes |
|----------|----------|-----------------|-------|
| `RESEND_API_KEY` | CRITICAL | resend.com → API Keys → Create | Used by `/src/lib/email/resend-client.ts` for all member switch alert emails. Without this, alerts are detected but no broker is ever notified. |
| `RESEND_FROM_EMAIL` | FEATURE | Your verified sending domain in Resend | Format: `alerts@aegissage.com`. Falls back to `alerts@aegissage.com` in code but SPF/DKIM checks will fail if the domain isn't verified in Resend. |

---

## 🟠 Stripe Billing — Required for subscription management

| Variable | Required | Where to get it | Notes |
|----------|----------|-----------------|-------|
| `STRIPE_SECRET_KEY` | CRITICAL | Stripe Dashboard → Developers → API Keys → Secret key | Use `sk_live_...` for production (never `sk_test_...` in prod). Server-only. |
| `STRIPE_WEBHOOK_SECRET` | CRITICAL | Stripe Dashboard → Webhooks → Your endpoint → Signing secret | Format: `whsec_...`. Used in `/api/stripe/webhook/route.ts` to validate that webhook events genuinely come from Stripe. Missing = webhook route accepts forged events. |
| `STRIPE_BROKER_PRICE_ID` | CRITICAL | Stripe Dashboard → Products → Broker plan → Price ID | Format: `price_...`. The recurring price ID for the $149/mo Broker tier. |
| `STRIPE_AGENCY_PRICE_ID` | CRITICAL | Stripe Dashboard → Products → Agency plan → Price ID | Format: `price_...`. The recurring price ID for the $749/mo Agency base tier. |

---

## 🟠 Cron Job Auth — Required for all 4 scheduled jobs

Vercel calls these endpoints on a schedule (defined in `vercel.json`). Without
`CRON_SECRET`, the cron routes reject all requests with a 401, silently
disabling the scheduled detection, AEP countdown, VCC dispatch, and
notification delivery.

| Variable | Required | Where to get it | Notes |
|----------|----------|-----------------|-------|
| `CRON_SECRET` | CRITICAL | Generate: `openssl rand -hex 32` | Must match the `Authorization: Bearer <token>` header that Vercel sends with cron invocations. Set in Vercel → Project → Settings → Cron Job Secret OR pass it manually in the Authorization header per route. |

---

## 🟡 VCC Fax Dispatch — Required for doctor-signed VCC form faxing

If missing, the VCC fax dispatch route (`/src/lib/vcc/fax-dispatcher.ts`) will
fail silently — forms are generated but never sent to carrier fax numbers.

| Variable | Required | Where to get it | Notes |
|----------|----------|-----------------|-------|
| `SRFAX_API_KEY` | FEATURE | srfax.com → Account → API Credentials | The SRFax REST API authentication key. |
| `SRFAX_ACCOUNT_NUMBER` | FEATURE | srfax.com → Account Settings | Your SRFax account number (numeric string). |
| `SRFAX_CALLER_ID` | FEATURE | Your registered fax number | Format: `15551234567` (no dashes). Defaults to `8005551234` in code — override with your real number. |
| `SRFAX_SENDER_EMAIL` | FEATURE | Your fax-associated email | Used as the reply-to on fax cover pages. Defaults to `noreply@aegissage.com`. |

---

## 🟡 AI Extraction — Required for the AI fallback scrape feature

Used by `/api/extension/ai-extract` when CSS-based portal scraping returns
0 rows. If missing, the extension silently skips the AI fallback and returns
an empty result.

| Variable | Required | Where to get it | Notes |
|----------|----------|-----------------|-------|
| `GENKIT_GOOGLE_AI_KEY` | FEATURE | Google AI Studio → Get API Key | Enables Gemini-powered page extraction when DOM scraping fails. Check `src/ai/genkit.ts` for the exact env var name the Genkit plugin reads — may be `GOOGLE_GENAI_API_KEY` depending on version. |

---

## 🟡 Application URL — Required for OAuth redirects and email links

| Variable | Required | Where to get it | Notes |
|----------|----------|-----------------|-------|
| `NEXT_PUBLIC_APP_URL` | FEATURE | Your production domain | Format: `https://aegissage.com` (no trailing slash). Used in email templates for dashboard links and in OAuth state construction. Missing causes broken links in alert emails. |

---

## 🟢 OPTIONAL — Have code-level fallbacks

These variables have hardcoded fallbacks in the codebase and will not cause
failures if omitted — but the fallbacks are incorrect for production.

| Variable | Fallback value | Impact of using fallback |
|----------|---------------|--------------------------|
| `NEXTAUTH_SECRET` | *(no fallback — only used as GHL_STATE_SECRET fallback)* | Set `GHL_STATE_SECRET` independently instead |
| `ADMIN_ENABLED` | Unset = `false` | Internal admin routes (`/api/admin/*`) remain disabled |

---

## 🔑 GitHub Actions Secrets (separate from Vercel)

These live in **GitHub → Repository → Settings → Secrets and variables → Actions**.
They are used exclusively by the CI/CD workflow and are never sent to Vercel.

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Personal access token from [vercel.com/account/tokens](https://vercel.com/account/tokens). Used by `vercel` CLI to authenticate deployments. |
| `VERCEL_ORG_ID` | Your Vercel team/personal org ID. Found in `.vercel/project.json` after running `vercel link` locally, or in Vercel Dashboard → Settings → General → Your ID. |
| `VERCEL_PROJECT_ID` | Your specific project ID. Found in `.vercel/project.json` after `vercel link`, or in Vercel Dashboard → Project → Settings → General → Project ID. |
| `NEXT_PUBLIC_SUPABASE_URL` | Stub value used during test discovery only. Set to your real Supabase URL so module imports don't throw during Jest. Real value is also in Vercel. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as above — stub for test runner. |

---

## Verification procedure

After setting all variables, run this verification sequence before opening
the beta to real brokers:

### 1. Supabase connection
```
curl https://aegissage.com/api/extension/verify \
  -H "Authorization: Bearer <any_broker_api_key>"
# Expected: { "valid": true, "broker_id": "...", "agency_id": "..." }
```

### 2. GHL OAuth flow
Navigate to `https://aegissage.com/ghl` and click Connect.
Should redirect to `marketplace.gohighlevel.com` and return to `/ghl?connected=1`.

### 3. Stripe webhook
```bash
stripe listen --forward-to https://aegissage.com/api/stripe/webhook
stripe trigger customer.subscription.created
# Check Vercel function logs for: [stripe/webhook] event received
```

### 4. Email delivery
Upload the synthetic test CSV (`aegissage-test-roster.csv`), then trigger a
MARx check on any member. Confirm an alert email arrives at the broker address
within 60 seconds.

### 5. Cron jobs (manual trigger)
```
curl -X POST https://aegissage.com/api/scheduler/detection \
  -H "Authorization: Bearer <CRON_SECRET>"
# Expected: { "success": true, ... }
```

### 6. PHI encryption round-trip
```
curl -X POST https://aegissage.com/api/book/update-mbi \
  -H "Cookie: <session_cookie>" \
  -d '{ "memberId": "<test_uuid>", "mbi": "1EG4TE5MK72" }'
# Then retrieve the member — MBI should display as **-***-**** in table
# and decrypt correctly when the overlay is opened.
```

---

## Security reminders

- `SUPABASE_SERVICE_ROLE_KEY` and `PHI_MASTER_SECRET` must be rotated together if either is compromised. Rotating `PHI_MASTER_SECRET` alone makes all encrypted records unreadable — coordinate a data re-encryption operation.
- `STRIPE_SECRET_KEY` rotation requires updating both Vercel and any local `.env.local` files simultaneously.
- All `NEXT_PUBLIC_*` variables are embedded in the client-side JavaScript bundle — never put secrets in `NEXT_PUBLIC_` prefixed variables.
- Add `SUPABASE_SERVICE_ROLE_KEY`, `PHI_MASTER_SECRET`, `GHL_CLIENT_SECRET`, and `STRIPE_SECRET_KEY` to your company password manager with a documented rotation schedule (recommended: 90 days).
