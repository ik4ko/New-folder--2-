# AegisSage.com — Website Copy Strategy, Pricing Architecture & Frontend Refactor Directive
### Version 2.0 — Final Pricing Tier Rules Applied

**Document Type:** CRO Strategy + Developer Handoff  
**Status:** Production-Ready · Version 2.0  
**Pricing:** Solo Broker $150/mo · Agency $749/mo (5 seats included)  
**Critical Rule:** ZERO free trials. All CTAs are access-forward. No loopholes for small teams.

---

## GOVERNING RULES — ENFORCED THROUGHOUT THIS DOCUMENT

| Rule | Enforcement |
|------|-------------|
| No free trial language | Not in buttons, subheadings, meta, tooltips, or microcopy anywhere |
| Compliance-first positioning | HIPAA, PHI isolation, and CMS audit trail appear before any feature copy |
| Access-forward CTAs only | "Get Instant Access" (Broker) · "Deploy Agency-Wide" (Agency) |
| Exact pricing constants | See Part 3 — no rounding, no approximation |
| Tier isolation enforced | Solo Plan: 1 seat, no team dashboard. Agency Plan: 5 seats included, overage model |
| Annual savings strings | Broker: "Save $360/yr" · Agency: "Save $1,800/yr" |

---
---

# PART 1 — HOME / LANDING PAGE COMPONENT OUTLINE

---

## Section 1: Navigation Bar

**Layout:** Fixed top, dark slate (`#050a14`), full-width  
**Left:** AegisSage logo mark + wordmark  
**Center:** Features · Pricing · Security & Compliance · Sign In  
**Right CTA:**
```
[ Get Instant Access → ]
```

**Compliance Microbar** (pinned beneath nav, one line, amber toned):
```
🛡️  CMS-Regulated Platform  ·  HIPAA-Compliant Infrastructure  ·  Not Affiliated with the U.S. Government or the Federal Medicare Program
```

---

## Section 2: Hero

**Background:** Deep space slate `#050a14` — full bleed  
**Layout:** Centered, contained in a rounded card (`rounded-[4rem]`)

**Badge above headline:**
```
⚡  Medicare Retention Intelligence — HIPAA Compliant · AES-256 · Unalterable Audit Trail
```

**H1 Headline:**
```
Stop Losing Medicare Clients
to Switches You Never Saw Coming.
```

**Subheadline:**
```
AegisSage is the only proactive retention platform built for independent Medicare
brokers and agency owners — combining real-time plan-change detection, AI-generated
CMS-compliant outreach scripts, and an unalterable compliance audit trail in one
secure, HIPAA-regulated system.
```

**Hero CTA Block:**

| Button | Copy | Destination | Style |
|--------|------|-------------|-------|
| Primary | `Get Instant Access — $150/mo →` | `/signup?plan=broker` | `bg-primary` |
| Secondary | `Agency Inquiry` | Opens `EnterpriseModal` | Ghost / outline |

**Trust Microstrip (4 items, inline beneath buttons):**
```
🔒 HIPAA Compliant    🔐 AES-256 Encrypted    📋 BAA Available    🏛️ Not Affiliated with CMS
```

---

## Section 3: The Three Pillars

**Section Label:** `THE AEGISSAGE ENGINE`

**Headline:**
```
Three Interlocking Systems. One Unbreakable Defense.
```

**Subheadline:**
```
Every feature in AegisSage traces back to three core pillars — each one targeting
a different failure point in traditional Medicare client retention.
```

---

### Pillar 1 — SSBCI Engine
**Badge:** `PILLAR 01` · **Accent:** Electric Blue

**Headline:** `SSBCI Engine — Switch, Status, Beneficiary Coverage Intelligence`

**Copy:**
```
The SSBCI Engine monitors your entire book of business against live CMS MARx data.
The moment a member's plan changes — or a future switch is detected — the engine
surfaces the alert before the effective date, giving you a measurable intervention window.

This isn't reactive reporting. It's proactive intelligence.
```

**Feature Bullets:**
- Real-time MARx portal integration via Chrome Extension
- Carrier switch detection at the roster level
- Future effective date classification (CRITICAL_PENDING tier)
- Automatic confidence scoring on every detected change

---

### Pillar 2 — Ghost Churn Monitor
**Badge:** `PILLAR 02` · **Accent:** Amber

**Headline:** `Ghost Churn Monitor — The Clients Who Left Without Telling You`

**Copy:**
```
Ghost churn is silent attrition — members who switch carriers at AEP or SEP
without notifying their broker. Your book looks intact on paper. Your renewal
commissions tell a different story.

The Ghost Churn Monitor cross-references your uploaded carrier rosters against
MARx verification data on a rolling 48-hour cycle, surfacing every silent
departure before the next commission statement reveals it.
```

**Feature Bullets:**
- 48-hour roster cross-reference cycle
- Termed and disenrolled member flagging
- Automatic color-coded risk tier classification (CRITICAL_PENDING · Switching · Active)
- Feeds directly into Shield Campaigns for immediate outreach

---

### Pillar 3 — Shield Campaigns
**Badge:** `PILLAR 03` · **Accent:** Emerald

**Headline:** `Shield Campaigns — Automated Retention Outreach, CMS-Compliant by Design`

**Copy:**
```
When churn is detected, Shield Campaigns deploys the response. AI-generated phone
scripts, SMS drafts, and email templates — each one produced by our Gemini-powered
script engine under strict CMS TPMO compliance rails.

No savings promises. No provider network claims. No pressure tactics.
Personalized, compliant outreach your members will actually respond to.
```

**Feature Bullets:**
- AI script generation in three formats: Phone Script · SMS Draft · Email Template
- CMS mandatory TPMO disclaimer auto-applied per 42 CFR §422.2268
- Prohibited language firewall — hardcoded into the model system prompt
- Direct GoHighLevel pipeline integration for automated delivery

---

## Section 4: Trust & Compliance Banner
**Position:** Immediately after the Three Pillars — before any pricing or feature breakdown.  
**Background:** Amber/warning tone — `bg-amber-950/30 border-amber-500/20`

**Section Label:** `ENTERPRISE COMPLIANCE INFRASTRUCTURE`

**Headline:**
```
Built for the Regulatory Environment Medicare Demands.
```

**Subheadline:**
```
Every record AegisSage touches is protected by a three-layer compliance architecture
designed for CMS audit readiness, HIPAA §164.312(b) access logging, and immutable
data integrity. This is not a compliance checkbox — it is the foundation of the platform.
```

---

### Compliance Card 1 — Unalterable Audit Trail

**Headline:** `Unalterable CMS Compliance Audit Log`

**Copy:**
```
Every sensitive operation — MBI access, member export, AI script generation,
CRM sync — writes an immutable entry to our compliance_audit_logs table.

Entries are protected by SQL-level append-only rules: not even our own
service accounts can modify or delete a record once written. This is the
audit trail your compliance officer needs and your E&O insurance demands.
```

**Technical proof points:**
```
· compliance_audit_logs → SQL RULE: no UPDATE, no DELETE
· event_type: PHI_ACCESS, CRM_EXPORT_STARTED, ROSTER_UPLOAD
· ip_address + timestamp captured on every entry
· HIPAA §164.312(b) access control audit requirement: ✓ Met
```

---

### Compliance Card 2 — PHI Isolation Layer

**Headline:** `Automatic PHI Regex Scrubber & Isolation Layer`

**Copy:**
```
Before any data reaches our AI model, the PHI Isolation Layer runs a regex scan
against every field. MBI values and any pattern matching Medicare Beneficiary
Identifier format are intercepted and blocked — the AI never sees a raw MBI,
a doctor's name, or a member's phone number.

The outreach script your broker sends was generated without the member's protected
health information ever leaving your encrypted storage layer.
```

**Technical proof points:**
```
· MBI regex guard: /\b[1-9][A-Z][A-Z0-9][A-Z][A-Z][0-9]...\b/
· Fields blocked from AI: mbi, doctor_name, doctor_fax, phone, address, dob
· PHI_MASTER_SECRET: AES-256-GCM, per-agency key derivation (PBKDF2)
· Vercel server logs: zero raw PHI values — PHI log audit passed May 2026
```

---

### Compliance Card 3 — CMS Audit Readiness

**Headline:** `CMS & HIPAA Audit Readiness`

**Copy:**
```
AegisSage is architected to support a CMS audit response out of the box.
Every broker action is tied to a user_id, agency_id, event_type, and IP
address. Every AI script generation records which CMS disclaimer was applied.
Every GHL data sync is stamped with status, member count, and timestamp.

No reconstruction. No scrambling. The record exists before the audit begins.
```

**Technical proof points:**
```
· Two-table audit strategy: compliance_audit_logs + enterprise_audit_logs
· 6-year retention compliance per HIPAA §164.316(b)(2)(i)
· TPMO disclaimer: auto-applied per CMS 42 CFR §422.2268
· BAA template: included for all Agency Plan subscribers
```

**Banner CTA strip:**
```
[ Download Security Architecture Overview ]     [ Request BAA Template ]
→ compliance@aegissage.com                        → 3 business day response
```

---

## Section 5: AI Script Engine — Feature Breakdown

**Section Label:** `THE SHIELD CAMPAIGN ENGINE — HOW IT WORKS`

**Headline:**
```
AI-Generated Retention Scripts.
Zero PHI Exposure. Full CMS Compliance.
```

**Subheadline:**
```
When the Ghost Churn Monitor flags a member at risk, Shield Campaigns deploys
a personalized outreach script in under 10 seconds — compliant by construction,
ready to send across three channels simultaneously.
```

**Three-step process:**

**Step 1 — Alert Detected**
```
The SSBCI Engine detects a plan switch or pending change. Alert is classified
by switch type, priority tier, and effective date. The broker is notified
immediately with full situational context on their dashboard.
```

**Step 2 — PHI-Safe Context Assembly**
```
The system extracts ONLY enrollment metadata for the AI:
  · Current carrier and plan name
  · Detected destination plan (if known)
  · Enrollment status and critical tier classification
  · D-SNP / dual-eligible flag

MBI, doctor information, phone numbers, and addresses are NEVER passed
to the AI model. The member's protected health information never leaves
your encrypted storage.
```

**Step 3 — Three Scripts, One API Call**
```
A single Gemini model call produces three ready-to-use formats:

📞 PHONE SCRIPT
   Full call structure: opening → TPMO disclosure → purpose statement
   → talking points → objection handler → soft close → opt-out offer.
   Calibrated for a 2–2.5 minute advisory conversation. Not a monologue.

📱 SMS DRAFT
   ≤ 160 characters. Warm, personal, non-pressured. Includes broker
   first name as signature. Never requests personal information via SMS.

📧 EMAIL TEMPLATE
   Subject line + professional body. CMS "I do not offer every plan"
   disclaimer auto-inserted in footer. Single CTA: call or schedule a call.
```

**Compliance Rail Display (visible guardrail UI block):**
```
WHAT THE AI IS FORBIDDEN TO GENERATE ──────────────────────────────────
✗  "You'll save money on premiums"
✗  "Your doctor is in network"
✗  Any competitor plan name comparison or disparagement
✗  "You must act now or lose your benefits"
✗  Any coverage guarantee or approval promise
✗  Artificial urgency or pressure-based close language

WHAT THE AI ALWAYS INCLUDES ────────────────────────────────────────────
✓  CMS TPMO identification disclosure (verbatim when required)
✓  "I am not connected with the U.S. government" statement
✓  Opt-out language: "If you'd prefer I don't contact you..."
✓  Broker name, agency name, and NPN reference
✓  PHI_ACCESS event logged immutably to compliance_audit_logs
```

---

## Section 6: Two-Tier Role Experience

*(Structure retained from existing codebase. Update CTAs and prices only — see Part 3.)*

- Broker tier CTA: `"Get Instant Access — $150/mo →"` → `/signup?plan=broker`
- Agency tier CTA: `"Request Enterprise Onboarding & Security Docs"` → `EnterpriseModal`

---

## Section 7: Stats Row

**Headline:** `Trusted by Independent Medicare Brokers and Agency Owners`

| Stat | Label |
|------|-------|
| 48 hrs | Average time to first churn alert after roster upload |
| 3 | AI script formats per alert, generated in under 10 seconds |
| 0 | PHI values ever passed to AI model inputs |
| 6 yrs | Audit log retention compliance built in |

---

## Section 8: Contact / Final CTA

**Headline:**
```
Ready to Stop Silent Churn?
```

**Subheadline:**
```
Choose your tier and get access today. No trial period. No onboarding delay.
Your first alert fires within 48 hours of uploading your roster.
```

**CTAs:**
```
[ Get Instant Access — $150/mo → ]     [ Agency Inquiry → ]
```

- Primary → `/signup?plan=broker`
- Secondary → opens `EnterpriseModal`
- **Zero instances of "Start Free Trial" anywhere on the page**

---
---

# PART 2 — HARDENED PRICING PAGE STRUCTURE

## Pricing Section Header

**Section ID:** `#pricing`  
**Background:** `bg-slate-50` border-y  
**Badge:**
```
TRANSPARENT PRICING — NO FREE TRIALS
```

**Headline:**
```
Two Tiers. Zero Hidden Fees. Immediate Access.
```

**Subheadline:**
```
Select your plan and activate today. No trial period. No onboarding lag.
Solo brokers cancel anytime. Agency plans on annual contract.
```

**Billing Toggle:** Monthly · Annual (retain existing toggle design)  
**Toggle savings label:**
```
Annual  — Broker saves $360/yr · Agency saves $1,800/yr
```

---

## Tier 1 — Solo Broker Plan

**Maps to:** `STRIPE_BROKER_PRICE_ID`

### Pricing
| Billing | Price | Annual Total | Savings Copy |
|---------|-------|--------------|--------------|
| Monthly | **$150/mo** | $1,800/yr | — |
| Annual | **$120/mo** | $1,440/yr billed annually | **"Save $360/yr"** |

### Plan Identity
- **Label:** `INDEPENDENT BROKER`
- **Plan Name:** `Solo Plan`
- **Seat Limit:** 1 broker seat — enforced at the subscription level, not just in UI
- **Icon:** Zap (lightning)

### Price Display Block
```
$150        /mo
─────────────────────────────
1 broker seat · Cancel anytime
```
When annual is toggled:
```
$120        /mo
─────────────────────────────
Billed as $1,440/yr · Save $360/yr
```

### Seat Limit Enforcement Copy (amber notice, subtle — beneath seat line)
```
⚠️  Solo Plan: 1 broker seat. Team features require the Agency Plan.
```

### Feature List

```typescript
const BROKER_FEATURES = [
  "Real-time MARx plan-change detection",
  "Ghost Churn Monitor — 48-hour roster cycle",
  "Chrome Extension: carrier portal sync",
  "AI-generated CMS-compliant scripts (Phone · SMS · Email)",
  "VCC form generation + physician fax dispatch",
  "HIPAA-compliant MBI storage (AES-256-GCM)",
  "Compliance audit log — append-only, unalterable",
  "Roster upload: CSV, Excel, Google Sheets",
  "AEP enrollment protection alerts",
  "CMS TPMO disclaimer auto-applied to all AI scripts",
]
```

### CTA Button
```
[ Get Instant Access → ]
```
- `href="/signup?plan=broker"`
- Style: `bg-slate-900 text-white hover:bg-primary`
- **NO "Start Free Trial" — not even as secondary copy**

### Sub-copy below CTA
```
Monthly billing · Cancel anytime · No trial period
```

### Compliance Note
```
All PHI stored under HIPAA-compliant infrastructure. BAA available on request.
```

---

## Tier 2 — Agency Plan

**Maps to:** `STRIPE_AGENCY_PRICE_ID`

### Pricing
| Billing | Base Price | Included Seats | Extra Seats | Annual Total | Savings Copy |
|---------|-----------|----------------|-------------|--------------|--------------|
| Monthly | **$749/mo** | 5 seats | +$49/seat/mo | $8,988/yr | — |
| Annual | **$599/mo** | 5 seats | +$39/seat/mo | $7,188/yr billed annually | **"Save $1,800/yr"** |

### Plan Identity
- **Label:** `AGENCY OWNER`
- **Plan Name:** `Agency Plan`
- **Included Seats:** 5 broker seats (out of the box, no extra charge)
- **Overage:** $49/seat/mo monthly · $39/seat/mo annual
- **Badge:** `ENTERPRISE` (top-right corner, primary color)
- **Icon:** Building2

### Price Display Block
```
$749        /mo base
─────────────────────────────
Includes 5 broker seats
```
When annual is toggled:
```
$599        /mo base
─────────────────────────────
Billed as $7,188/yr · Save $1,800/yr
Includes 5 broker seats
```

### Seat Overage Line (below price)
```
+$49/broker seat/mo beyond the first 5
```
When annual toggled:
```
+$39/broker seat/mo beyond the first 5 (annual)
```

### Annual Contract Notice (amber box)
```
⚠️  Annual contract required · Non-cancellable mid-term · Net-30 invoicing available
```

### Value Proposition — "Silent Owner" Master Dashboard

This is the Agency Plan's primary differentiator. Lead with it in all copy.

**Hero Feature Block (above feature list, full-width inside card):**
```
THE SILENT OWNER MASTER DASHBOARD

Monitor every broker's book simultaneously — without touching a single file.

As an agency owner, you have a private command layer that sits above your entire
downline. You see every switch alert, every churn risk, every compliance event across
all broker seats in real time. Your brokers see only their own books. You see everything.

No broker knows what another broker's book looks like. No data bleeds across seats.
One owner view. Total intelligence. Zero cross-contamination.
```

### Feature List

```typescript
const AGENCY_FEATURES = [
  "Everything in Solo Plan — for every included seat",
  "Silent Owner Master Dashboard — full downline visibility",
  "Broker-isolated data: zero cross-seat contamination",
  "5 broker seats included (no overage on first 5)",
  "Multi-tenant GoHighLevel routing to separate sub-accounts",
  "BOB → GHL outbound push with retention tags per broker",
  "Role-based access: Owner · Manager · Customer Service · Broker",
  "Agency-wide compliance_audit_logs export (CMS-submittable)",
  "Enterprise audit trail: machine-readable HIPAA access log",
  "AI retention scripts for entire agency downline (unlimited)",
  "Carrier Edge-Mapping: live portal selector updates",
  "BAA template included · Security architecture docs on request",
  "Priority support · Dedicated onboarding call",
]
```

### CTA Button
```
[ Deploy Agency-Wide → ]
```
- Opens `EnterpriseModal`
- Style: `bg-primary text-white hover:bg-primary/90`
- Icon: `Send` (retain existing)
- **Exact copy:** "Request Enterprise Onboarding & Security Docs" inside modal header

### Sub-copy below CTA
```
BAA included · Compliance packet on request · 3 business day onboarding response
```

### Seat Calculator (optional UI addition — recommended for conversion)

A live seat estimator inside the Agency card:

```
YOUR AGENCY COST CALCULATOR

 Base (5 seats included):    $749/mo
 Additional brokers: [ − ] 0 [ + ]
 ─────────────────────────────────────
 Monthly estimate:           $749/mo
```

As the user increments additional seats, the estimate updates:
```
 Additional brokers: [ − ] 3 [ + ]
 Monthly estimate:  $749 + (3 × $49) = $896/mo
```

---

## Compliance Trust Grid (below both cards)

| Icon | Title | Subtitle |
|------|-------|----------|
| 🛡️ Shield | HIPAA Compliant | PHI handled under signed BAA |
| 🔐 Lock | AES-256 Encrypted | MBI + credentials encrypted at rest |
| 📋 CheckCircle | Unalterable Audit Log | SQL append-only — no UPDATE, no DELETE |
| 📊 BarChart3 | CMS Audit-Ready | 6-year log retention, regulator-exportable |

---

## Pricing FAQ Block

**Q: Is there a free trial?**
```
No. AegisSage does not offer a free trial. We're a HIPAA-regulated platform
handling Medicare beneficiary data — provisioning trial access requires the same
compliance infrastructure as a paid account, and we don't offer that without
a subscription.

The Solo Broker Plan is $150/month with monthly billing and no minimum commitment.
If it doesn't work for your book, cancel at the end of your billing cycle.
```

**Q: Why can't I add team members to the Solo Plan?**
```
The Solo Plan is strictly one broker seat. This isn't a technical limitation we
can work around — it's a deliberate tier boundary.

If you manage other brokers, share books, or need any form of oversight dashboard,
you need the Agency Plan. It includes 5 seats at $749/mo, with additional seats
at $49 each. Running a 3-broker team? That's $749/mo total — still cheaper than
three individual Solo Plans.
```

**Q: What does "5 seats included" mean exactly?**
```
The Agency Plan base price ($749/mo monthly · $599/mo annual) covers up to 5
broker seats — meaning 5 individual brokers can each have their own isolated book,
their own alert feed, and their own compliance log, all visible to the agency owner
through the Silent Owner Master Dashboard.

Seats 6, 7, 8+ are $49/mo each (or $39/mo on annual). You only pay for the seats
you actually activate.
```

**Q: How does multi-sub-account GoHighLevel routing work?**
```
Each broker seat in the Agency Plan can be connected to a separate GoHighLevel
sub-account. When the BOB → GHL outbound push runs, AegisSage routes each broker's
member data to their specific GHL location — not to a shared account.

This means Broker A's retention campaigns fire in Broker A's GHL workspace.
Broker B's campaigns fire in Broker B's workspace. Zero mixing. The agency owner
can view all sync statuses from the Silent Owner Master Dashboard.
```

---
---

# PART 3 — FRONTEND PRICING REFACTOR DIRECTIVE

## Target File: `src/app/page.tsx`

**Priority:** P0 — ship before any paid acquisition  
**Estimated effort:** 45–60 minutes  
**Auditor note:** Every line reference below was verified against the live file at time of writing.

---

### STEP 1 — Replace Pricing Constants

**Location:** Lines ~156–157

```typescript
// ─── REMOVE THESE LINES ────────────────────────────────────────────
const brokerPrice = billingAnnual ? 119 : 149
const agencyPrice = billingAnnual ? 599 : 749

// ─── REPLACE WITH THESE EXACT CONSTANTS ────────────────────────────
const brokerPrice           = billingAnnual ? 120  : 150
const agencyPrice           = billingAnnual ? 599  : 749
const baseIncludedSeats     = 5
const extraSeatPriceMonthly = 49
const extraSeatPriceAnnual  = 39
```

---

### STEP 2 — Update Annual Savings Copy Strings

**Location:** Line ~378 (broker card) and line ~407 (agency card)

```tsx
{/* BROKER CARD — CURRENT: */}
{billingAnnual && <p ...>Billed annually · Save $360/yr</p>}
{/* ✓ KEEP THIS — savings figure is already correct at $360/yr */}
{/* But confirm price display shows $120/mo, not $119/mo */}

{/* AGENCY CARD — CURRENT: */}
{billingAnnual && <p ...>Billed annually · Save $1,800/yr</p>}
{/* ✓ KEEP THIS — $1,800/yr is correct for $749→$599 delta */}
```

**Add billed-annually total lines** beneath each savings string:

```tsx
{/* BROKER — add beneath "Save $360/yr": */}
{billingAnnual && (
  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
    Billed as $1,440/yr
  </p>
)}

{/* AGENCY — add beneath "Save $1,800/yr": */}
{billingAnnual && (
  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
    Billed as $7,188/yr
  </p>
)}
```

---

### STEP 3 — Kill All "Start Free Trial" CTAs

Search: `Start Free Trial` — **4 exact instances to replace**

| Approx Line | Section | Current Copy | New Copy |
|-------------|---------|--------------|----------|
| ~200 | Hero primary CTA | `Start Free Trial` | `Get Instant Access` |
| ~263 | Broker tier card CTA | `Start Free Trial — $149/mo` | `Get Instant Access — $150/mo →` |
| ~389 | Pricing card Broker CTA | `Start Free Trial` | `Get Instant Access →` |
| ~449 | Contact section CTA | `Start Free Trial` | `Get Instant Access →` |

**Also update contact section subheadline** (~line 445):
```tsx
{/* REMOVE: */}
"Individual brokers start free. Agencies request an onboarding call."

{/* REPLACE WITH: */}
"Choose your tier and get access today. First alert fires within 48 hours of your first roster upload."
```

---

### STEP 4 — Update Broker Price Display in Tier Section

**Location:** ~line 263, inside the Broker tier card

```tsx
{/* CURRENT: */}
<Link href="/signup?plan=broker">Start Free Trial — $149/mo</Link>

{/* REPLACE WITH: */}
<Link href="/signup?plan=broker">Get Instant Access — $150/mo →</Link>
```

---

### STEP 5 — Update BROKER_FEATURES Array

**Location:** `const BROKER_FEATURES = [...]` (~line 127)

```typescript
const BROKER_FEATURES = [
  "Real-time MARx plan-change detection",
  "Ghost Churn Monitor — 48-hour roster cycle",
  "Chrome Extension: carrier portal sync",
  "AI-generated CMS-compliant scripts (Phone · SMS · Email)",
  "VCC form generation + physician fax dispatch",
  "HIPAA-compliant MBI storage (AES-256-GCM)",
  "Compliance audit log — append-only, unalterable",
  "Roster upload: CSV, Excel, Google Sheets",
  "AEP enrollment protection alerts",
  "CMS TPMO disclaimer auto-applied to all AI scripts",
]
```

---

### STEP 6 — Update AGENCY_FEATURES Array

**Location:** `const AGENCY_FEATURES = [...]` (~line 138)

```typescript
const AGENCY_FEATURES = [
  "Everything in Solo Plan — for every included seat",
  "Silent Owner Master Dashboard — full downline visibility",
  "Broker-isolated data: zero cross-seat contamination",
  "5 broker seats included (overage: +$49/seat/mo)",
  "Multi-tenant GoHighLevel routing to separate sub-accounts",
  "BOB → GHL outbound push with retention tags per broker",
  "Role-based access: Owner · Manager · CS · Broker",
  "Agency-wide compliance_audit_logs export (CMS-submittable)",
  "AI retention scripts for entire agency downline (unlimited)",
  "Carrier Edge-Mapping: live portal selector updates",
  "BAA template included · Compliance packet on request",
  "Priority support · Dedicated onboarding call",
]
```

---

### STEP 7 — Update Seat Overage Line (Agency Card)

**Location:** ~line 408 (below agency price, above annual contract notice)

```tsx
{/* CURRENT: */}
<p className="...">+$49/broker seat/mo</p>

{/* REPLACE WITH: */}
<p className="...">
  +{billingAnnual ? `$${extraSeatPriceAnnual}` : `$${extraSeatPriceMonthly}`}/broker seat/mo
  beyond the first {baseIncludedSeats}
</p>
```

---

### STEP 8 — Add Seat Enforcement Notice (Solo Plan)

**Location:** Inside broker pricing card, beneath the seat descriptor line (~line 379)

```tsx
{/* ADD after "One broker seat" line: */}
<p className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5 inline-block mt-2">
  1 seat limit · Team features require Agency Plan
</p>
```

---

### STEP 9 — Update Pricing Badge and Headline

**Location:** Lines ~354–355

```tsx
{/* BADGE — CURRENT: */}
<Badge>Transparent Pricing</Badge>
{/* REPLACE WITH: */}
<Badge>Transparent Pricing — No Free Trials</Badge>

{/* HEADLINE — CURRENT: */}
Two Tiers. <span>Zero Hidden Fees.</span>
{/* REPLACE WITH: */}
Two Tiers. <span>Immediate Access.</span>
```

---

### STEP 10 — Add Sub-Copy Below Broker CTA

**Location:** After the "Get Instant Access" button in the broker pricing card

```tsx
<p className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center mt-3">
  Monthly billing · Cancel anytime · No trial period
</p>
```

---

### STEP 11 — Secondary File Audit

All files below must be checked for free trial language and legacy prices:

| File | What to Search | Action |
|------|---------------|--------|
| `src/app/signup/page.tsx` | `free trial`, `trial`, `$149`, `$79` | Replace or remove all instances |
| `src/components/billing-v2/pricing-sandbox.tsx` | `SANDBOX_BROKER_MONTHLY`, prices | Update sandbox to $150/$749 |
| `src/app/dashboard/billing/page.tsx` | `trial`, `Free Trial`, `$149` | Replace with access-forward copy |
| `src/components/onboarding-checklist.tsx` | `trial`, `free` | Replace with "getting started" language |
| `src/app/settings/layout.tsx` | `trial` | Audit and remove |

---

### STEP 12 — Stripe Environment Variable Confirmation

Confirm the following are set in **Vercel → Project → Settings → Environment Variables (Production)** before enabling live checkout:

```bash
STRIPE_BROKER_PRICE_ID=price_xxxxx
# → $150/mo recurring, no trial, monthly · Plus $1,440/yr annual product

STRIPE_AGENCY_PRICE_ID=price_xxxxx
# → $749/mo recurring base, no trial · Plus $7,188/yr annual product
# → Separate per-seat add-on price: $49/seat/mo (monthly) · $39/seat/mo (annual)

STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_APP_URL=https://aegissage.com
```

**Stripe Product Setup Checklist:**

```
□  Broker product: $150/mo recurring, no trial period, cancel anytime
□  Broker annual product: $1,440/yr one-time recurring (or $120×12 subscription)
□  Agency product: $749/mo recurring, annual contract flag, no trial
□  Agency annual product: $7,188/yr
□  Agency seat add-on: $49/seat/mo (monthly) · $39/seat/mo (annual)
□  All products: trial_period_days = 0 (explicitly set in Stripe Dashboard)
□  Webhook endpoint registered: /api/stripe/webhook
□  Webhook events: customer.subscription.created, customer.subscription.updated,
                   customer.subscription.deleted, invoice.payment_failed
```

---

## Complete Developer Checklist

```
PRICING CONSTANTS
□  brokerPrice:           $150 monthly · $120 annual
□  agencyPrice:           $749 monthly · $599 annual
□  baseIncludedSeats:     5
□  extraSeatPriceMonthly: 49
□  extraSeatPriceAnnual:  39

ANNUAL SAVINGS STRINGS
□  Broker card:  "Save $360/yr" · "Billed as $1,440/yr"
□  Agency card:  "Save $1,800/yr" · "Billed as $7,188/yr"

FREE TRIAL ELIMINATION (4 instances in page.tsx)
□  Line ~200: Hero CTA         → "Get Instant Access"
□  Line ~263: Broker tier CTA  → "Get Instant Access — $150/mo →"
□  Line ~389: Pricing Broker   → "Get Instant Access →"
□  Line ~449: Contact CTA      → "Get Instant Access →"
□  Line ~445: Contact sub      → Updated subheadline (no "start free" language)

FEATURE ARRAYS
□  BROKER_FEATURES:  10-item array updated
□  AGENCY_FEATURES:  12-item array updated (Silent Owner Dashboard lead item)

SEAT COPY
□  Broker card seat limit notice: "1 seat limit · Team features require Agency Plan"
□  Agency seat overage: dynamic string using extraSeatPrice constants
□  Agency "includes X seats" line: "5 broker seats included"

PRICING SECTION COPY
□  Badge: "Transparent Pricing — No Free Trials"
□  Headline: "Two Tiers. Immediate Access."
□  Broker sub-copy: "Monthly billing · Cancel anytime · No trial period"
□  Agency billed string: "$7,188/yr billed annually · Save $1,800/yr"

SECONDARY FILES
□  signup/page.tsx: no trial language
□  billing-v2/pricing-sandbox.tsx: updated to $150/$749
□  dashboard/billing/page.tsx: no trial language
□  onboarding-checklist.tsx: no trial language

STRIPE
□  STRIPE_BROKER_PRICE_ID: live product, $150/mo, no trial
□  STRIPE_AGENCY_PRICE_ID: live product, $749/mo, no trial
□  Seat add-on price IDs created and mapped
□  trial_period_days = 0 on all products
□  Webhook events registered and tested
```

---

*Strategy v2.0 — AegisSage · Solo Broker $150/mo (1 seat) · Agency $749/mo (5 seats included)*  
*All compliance copy reflects live backend: compliance_audit_logs, enterprise_audit_logs, PHI_MASTER_SECRET AES-256, CMS TPMO rails*  
*Zero free trials enforced at Stripe product level, UI level, and copy level*
