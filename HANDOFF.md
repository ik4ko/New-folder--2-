# AegisSage — Current State (May 2026)

## Live URL
https://www.aegissage.com

## Stack
Next.js App Router, Supabase (sxqdjilabbmjobjpwwst),
Vercel, GoHighLevel API

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

## Pending Activation (needs credentials)
- SRFax: SRFAX_API_KEY, SRFAX_ACCOUNT_NUMBER,
  SRFAX_CALLER_ID, SRFAX_SENDER_EMAIL
- Gemini: GOOGLE_GENAI_API_KEY (rotate old one)
- Resend: RESEND_API_KEY (re_ prefix, not vck_)
- Stripe: rotate all keys before first real customer

## Known Issues Remaining
- Broker sidebar Management section may still flash
- Settings broker pages (profile/ghl/notifications)
  need testing
- VCC PDF field mapping not done yet (no carrier PDFs mapped)
- CMS-1696 PDF not uploaded to aor-templates bucket

## Test Accounts
- ikan9191@gmail.com — Agency Owner
- ika9191@gmail.com — Broker under same agency
- Password: AegisSage2026! (change before launch)

## Supabase Migrations Applied (20 total)
All through 20260517000000_fix_rls_infinite_recursion

## Key Files
- src/hooks/useRole.ts — role detection
- src/components/app-sidebar.tsx — nav gating
- src/app/dashboard/page.tsx — stat cards per role
- src/middleware.ts — route protection
- src/lib/email/ — Resend notifications
- src/lib/vcc/ — PDF engine + fax dispatcher
- src/lib/campaigns/ — GHL workflow engine
