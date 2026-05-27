# Carrier Portal Selector Mapping Guide

## How to Map a Carrier

1. Log into the carrier portal manually in Chrome
2. Open DevTools → Elements (F12 → Ctrl+Shift+C)
3. Click the login username field → right-click → Copy → Copy selector
4. Do the same for password field and submit button
5. After login, navigate to the member/roster page
6. Find the export/download button — right-click → Copy selector
7. Update the scraper file with real selectors
8. Use the "Test Login" button in /settings/carriers to verify

## How to Use the Test Endpoint

```bash
# Test login for a connected carrier (uses stored encrypted credentials):
POST /api/detection/test
Body: { "carrier": "humana" }

# Returns:
{
  "success": true/false,
  "screenshot_url": "https://... (1hr signed URL)",
  "page_title": "Humana Producer Portal",
  "current_url": "https://www.humana.com/producer/dashboard",
  "error": "..." (if failed)
}
```

Open the screenshot_url to see exactly what page Playwright landed on.
This tells you what selectors to look for.

---

## Humana (humana.com/producer)

**Status:** MAPPED ✓  
**Scraper:** `src/lib/detection/carrier-scrapers/humana.ts`

### Login flow (5 steps)

1. Navigate to `https://www.humana.com/producer`
2. Click **"Agent sign-in"** link → redirects to SSO login page
3. Enter username + password → click **"Sign in"**
4. Handle **"Select where you want to sign in"** modal → click **"Agent"** button
   (modal doesn't always appear — handled with try/catch)
5. Lands on **Humana Vantage** at `https://agentportal.humana.com/Vantage`

### Roster export flow

1. Navigate to `https://agentportal.humana.com/Vantage/MyBusiness`
2. Click **"Active Policies"** in the left nav panel
3. Click **"Reports"** tab
4. Select **"All Columns"** radio button
5. Select **".CSV"** format radio button
6. Click **"Export"** → CSV file downloads

### Confirmed selectors

| Element | Selector |
|---|---|
| Landing page | `https://www.humana.com/producer` |
| Agent sign-in link | `a:has-text("Agent sign-in")` |
| Username field | `input[name="username"]` |
| Password field | `input[type="password"]` |
| Sign In button | `button:has-text("Sign in")` |
| Modal Agent button | `button:has-text("Agent")` |
| My Business URL | `https://agentportal.humana.com/Vantage/MyBusiness` |
| Active Policies nav | `text="Active Policies"` |
| Reports tab | `text="Reports"` |
| All Columns radio | `text="All Columns"` |
| CSV format radio | `text=".CSV"` |
| Export button | `button:has-text("Export")` |

### CSV column mapping (All Columns export)

Humana Vantage exports these headers — mapped in `roster-parser.ts`:

| CSV Column | RosterRow field |
|---|---|
| `Name` | `full_name` |
| `ID` | `member_id` |
| `Plan Type` | `plan_name` |
| `Effective Date` | `effective_date` |
| `Status` | `status` |
| `Date of Birth` | `dob` |

Fallback candidates are also configured in `CARRIER_COLUMNS['humana']` in case
column header names differ between portal versions.

### MFA handling

If Humana shows "Verify your identity" after login, `doLogin()` throws
`Error('MFA required for humana')`. `run-detection.ts` catches this and sets
`carrier_logins.status = 'mfa_required'`. The broker sees a "Verify →" link
in `/settings/carriers` pointing to `/settings/carriers/verify/humana`.

---

## UHC (uhcprovider.com)

**Status:** NEEDS MAPPING  
**Scraper:** `src/lib/detection/carrier-scrapers/uhc.ts`

| Element | Current Selector (Placeholder) | Real Selector (TODO) |
|---|---|---|
| Login URL | `https://www.uhcprovider.com/en/producer-resources.html` | TODO: verify login page URL |
| Username field | `#username, input[type="email"]` | TODO: inspect login form |
| Password field | `input[type="password"]` | TODO: inspect login form |
| Submit button | `button[type="submit"]` | TODO: inspect submit |
| Roster URL | None — navigated after login | TODO: find member section |
| Export button | `button:has-text("Download")` | TODO: inspect roster page |

**Notes:**
- UHC has multiple portals — confirm correct producer portal URL
- May use Okta SSO

---

## Aetna

**Status:** NO SCRAPER — Not yet implemented  
**Scraper:** None (returns "No scraper available for this carrier")  
**Portal URL:** TBD — likely producer.aetna.com  

To implement: create `src/lib/detection/carrier-scrapers/aetna.ts`  
extending `CarrierScraper` and add `case 'aetna'` to `getScraperForCarrier()` in `run-detection.ts`.

---

## BCBS

**Status:** NO SCRAPER — Not yet implemented  
**Scraper:** None (returns "No scraper available for this carrier")  
**Note:** BCBS is state-specific — stored as `bcbs_ca`, `bcbs_fl`, etc.  
Each state plan has a different portal URL.

To implement: create `src/lib/detection/carrier-scrapers/bcbs.ts`  
with a state lookup table mapping `bcbs_XX` → portal URL.

---

## Wellcare

**Status:** NO SCRAPER — Not yet implemented  
**Scraper:** None (returns "No scraper available for this carrier")  
**Portal URL:** TBD — likely producer.wellcare.com

To implement: create `src/lib/detection/carrier-scrapers/wellcare.ts`.

---

## Adding a New Scraper

1. Create `src/lib/detection/carrier-scrapers/{carrier}.ts`
2. Extend `CarrierScraper` from `./base`
3. Implement `doLogin(page, username, password): Promise<boolean>`
4. Implement `downloadRoster(page): Promise<RosterRow[]>`
5. Add `case '{carrier}': return new {Carrier}Scraper()` to `getScraperForCarrier()` in `run-detection.ts`
6. Test with `POST /api/detection/test` body `{ "carrier": "{carrier}" }`

## RosterRow shape expected by diffRosterAgainstGHL

```typescript
type RosterRow = {
  full_name?: string
  member_id?: string
  plan_name?: string
  effective_date?: string
  status?: string
}
```

Map carrier-specific column names to these fields in `downloadRoster()`.
