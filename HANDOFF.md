# AegisSage — Current State (May 2026)

## Live URL
https://www.aegissage.com

## Stack
Next.js App Router, Supabase (sxqdjilabbmjobjpwwst),
Vercel (Hobby plan), GoHighLevel API

## Two-Dashboard System
STAFF (agency_owner, agency_admin, customer_service):
- Sees all agency clients, team management,
  manager view, all VCC/AOR/alerts
- Nav: All Clients, Churn, VCC, Campaigns,
  AI Retention, Aegis Lock, Team, Manager View

BROKER (broker, solo_broker):
- Sees only assigned clients
- Nav: My Book, Churn, VCC, Campaigns,
  AI Retention, Aegis Lock
- No Team, no Manager View

## Three Core Pillars
1. VCC Forms — /dashboard/vcc (fax to doctor)
2. Churn Monitor — /dashboard/churn (roster diff)
3. Aegis Lock — /dashboard/aor (CMS-1696 AOR)

## Carrier Portal Detection System
- Credential vault: /settings/carriers
  - 5 carriers: Humana, UHC, Aetna, BCBS, Wellcare
  - AES-256-GCM encryption (src/lib/crypto-server.ts)
  - Manual trigger: "Run Now" per carrier, "Run All Carriers" global
  - Test login: "Test Login" button — launches Playwright, takes screenshot,
    saves to detection-logs bucket with 1hr signed URL
- Playwright via @sparticuz/chromium (downloads binary at cold start)
  - base.ts uses chromium.executablePath() — works on Vercel serverless
  - Humana + UHC scrapers exist with PLACEHOLDER selectors (see CARRIER_MAPPING.md)
  - Aetna, BCBS, Wellcare: no scrapers yet — returns error gracefully
- API routes:
  - POST /api/detection/run — manual trigger (auth required)
  - POST /api/detection/test — test login + screenshot (auth required)
  - GET /api/scheduler/detection — cron 6am UTC (CRON_SECRET)
- Storage bucket: detection-logs (private, PNG screenshots)
- CARRIER_MAPPING.md — selector mapping guide + how to add new scrapers

## Pending Activation (needs credentials)
- SRFax: SRFAX_API_KEY, SRFAX_ACCOUNT_NUMBER,
  SRFAX_CALLER_ID, SRFAX_SENDER_EMAIL
- Gemini: GOOGLE_GENAI_API_KEY (rotate old one)
- Resend: RESEND_API_KEY (re_ prefix, not vck_)
- Stripe: rotate all keys before first real customer

## Known Issues / Pending Work
- Humana + UHC portal selectors are PLACEHOLDERS — need mapping
  Use "Test Login" button + screenshot to discover real selectors
  See CARRIER_MAPPING.md for full instructions
- Aetna, BCBS, Wellcare scrapers not yet built
- VCC PDF field mapping not done yet (no carrier PDFs mapped)
- CMS-1696 PDF not uploaded to aor-templates bucket
- Playwright cold start on Vercel downloads ~170MB Chromium from
  GitHub Releases — first invocation per deployment takes ~30-60s
  Mitigation: upgrade to Pro plan + set CHROMIUM_S3_URL to a
  faster CDN (e.g. upload binary to your own S3 bucket)

## Vercel Plan Notes
- Currently on Hobby plan
- maxDuration = 300 in route files (capped at 60s on Hobby)
- To unlock 300s timeouts: upgrade to Pro or use team account
- Memory is Hobby default (1024 MB) — may OOM on Playwright
  If detection crashes with OOM, upgrade to Pro for 3008 MB config

## Test Accounts
- ikan9191@gmail.com — Agency Owner
- ika9191@gmail.com — Broker under same agency
- Password: AegisSage2026! (change before launch)

## Supabase Migrations Applied (21 total)
All through 20260517030000_detection_system.sql

## Key Files
- src/hooks/useRole.ts — role detection
- src/components/app-sidebar.tsx — nav gating (server component)
- src/app/dashboard/page.tsx — stat cards per role
- src/middleware.ts — route protection
- src/lib/email/ — Resend notifications
- src/lib/vcc/ — PDF engine + fax dispatcher
- src/lib/campaigns/ — GHL workflow engine
- src/lib/detection/ — Playwright scraper layer
- src/lib/crypto-server.ts — AES-256-GCM encrypt/decrypt
- CARRIER_MAPPING.md — how to map carrier portal selectors
