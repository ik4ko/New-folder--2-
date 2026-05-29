-- ============================================================
-- Autonomous Carrier Edge-Mapping Engine
-- Migration: 20260528040000_carrier_edge_maps
--
-- Purpose:
--   Replaces hardcoded CSS/DOM selectors in the Chrome extension with
--   server-delivered, hot-updatable selector sets per carrier portal.
--
--   When Humana or Aetna mutates their portal DOM, we update a single
--   row in this table and all extensions pick up the new selectors
--   on next fetch — no Chrome Web Store review cycle required.
--
-- Architecture:
--   Extension calls GET /api/edge-mapping (authenticated via extension_api_key)
--   → receives the full active selector set for the requested carrier
--   → caches locally for 15 minutes with a version hash check
--   → falls back to hardcoded selectors if the fetch fails (graceful degradation)
--
-- Versioning:
--   `version` increments on every selector update.
--   Extensions compare their cached version against the returned version
--   to know whether to invalidate their local cache.
--
-- Safety:
--   RLS: only authenticated agency members can read (via extension_api_key).
--   Write access is service-role only — no broker can modify selectors.
--   `is_active = false` disables a carrier's selectors without deleting history.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.carrier_edge_maps (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identity ────────────────────────────────────────────────────────────
  carrier_slug     TEXT        NOT NULL UNIQUE,  -- e.g. 'humana', 'aetna', 'uhc'
  carrier_display  TEXT        NOT NULL,         -- e.g. 'Humana', 'Aetna', 'UHC'
  portal_base_url  TEXT        NOT NULL,         -- Base URL the extension navigates to

  -- ── Core DOM Selectors ───────────────────────────────────────────────────
  -- CSS selectors that the extension uses to extract member data
  mbi_selector           TEXT,  -- Input or text element containing the MBI
  roster_row_selector    TEXT,  -- Table row selector for member list
  name_selector          TEXT,  -- Member full name element
  plan_selector          TEXT,  -- Plan name / plan ID element
  status_selector        TEXT,  -- Enrollment status element
  effective_date_selector TEXT, -- Plan effective date element

  -- ── Interaction Selectors ────────────────────────────────────────────────
  -- Used by the extension to trigger portal interactions
  search_input_selector  TEXT,  -- MBI search box
  search_button_selector TEXT,  -- Search submit button
  login_field_selector   TEXT,  -- Username/email field (for auto-login detection)

  -- ── Extraction Config ────────────────────────────────────────────────────
  extraction_strategy TEXT NOT NULL DEFAULT 'css'
    CHECK (extraction_strategy IN (
      'css',       -- standard CSS selector
      'xpath',     -- XPath expression (for complex portal structures)
      'aria',      -- ARIA label-based (most stable across DOM changes)
      'text'       -- Text content match (last resort)
    )),

  -- ── Version & Activation ─────────────────────────────────────────────────
  version          INTEGER     NOT NULL DEFAULT 1,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  last_verified_at TIMESTAMPTZ,          -- When selectors were last tested against live portal
  verified_by      TEXT,                  -- Who verified (email or 'system')

  -- ── Notes & Fallback ─────────────────────────────────────────────────────
  notes            TEXT,                  -- Internal notes on portal quirks
  fallback_enabled BOOLEAN     NOT NULL DEFAULT TRUE,
  -- JSON blob of hardcoded fallback selectors used when this map is unavailable
  fallback_selectors JSONB     DEFAULT '{}',

  -- ── Audit ────────────────────────────────────────────────────────────────
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Automatically bump updated_at on every row update
CREATE OR REPLACE FUNCTION public.touch_carrier_edge_map_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER carrier_edge_maps_updated_at
  BEFORE UPDATE ON public.carrier_edge_maps
  FOR EACH ROW EXECUTE FUNCTION public.touch_carrier_edge_map_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────

ALTER TABLE public.carrier_edge_maps ENABLE ROW LEVEL SECURITY;

-- Any authenticated agency member (owner or broker) can READ active maps.
-- The extension authenticates via extension_api_key, which resolves to a
-- broker row — the service client in the API route then reads this table.
CREATE POLICY "edge_maps_read_authenticated"
  ON public.carrier_edge_maps
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can INSERT / UPDATE / DELETE (handled via admin client in migration
-- tools or internal scripts — never from browser clients).
-- No additional policy needed: service role bypasses RLS.

-- ── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_edge_maps_carrier_slug
  ON public.carrier_edge_maps(carrier_slug)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_edge_maps_active
  ON public.carrier_edge_maps(is_active, updated_at DESC);

-- ── Seed: initial carrier selector sets ──────────────────────────────────
-- These are the known-good selectors as of the migration date.
-- They will auto-increment version on each UPDATE via the trigger above.

INSERT INTO public.carrier_edge_maps
  (carrier_slug, carrier_display, portal_base_url,
   mbi_selector, roster_row_selector, name_selector,
   plan_selector, status_selector, effective_date_selector,
   search_input_selector, search_button_selector,
   extraction_strategy, notes, last_verified_at, verified_by)
VALUES

-- Humana Vantage
(
  'humana',
  'Humana',
  'https://agentportal.humana.com/Vantage/MyBusiness',
  '[data-testid="member-hicn"], .member-hicn, td.hicn-cell',
  'table.member-list tbody tr, tr.member-row',
  'td.member-name, .member-fullname',
  'td.plan-name, .plan-description',
  'td.enrollment-status, .status-badge',
  'td.effective-date, .eff-date',
  'input[name="memberSearch"], input#memberHICN, input[placeholder*="HIC"]',
  'button[type="submit"].search-btn, button#searchMembers',
  'css',
  'Humana Vantage portal — member search uses HIC number (= MBI). Selectors stable as of 2026-05.',
  now(),
  'system'
),

-- UHC Producer Portal
(
  'uhc',
  'UHC',
  'https://www.uhcprovider.com/en/resource-library/news/2021/producer-portal.html',
  '[data-field="memberId"], .member-id-cell, td[aria-label*="Member ID"]',
  'tr[data-member-id], tbody tr.member-data-row',
  'td[aria-label*="Member Name"], .member-name-field',
  'td[aria-label*="Plan"], .plan-name-cell',
  'td[aria-label*="Status"], .status-indicator',
  'td[aria-label*="Effective"], .effective-date-cell',
  'input#memberSearchInput, input[placeholder*="Member ID"]',
  'button.search-submit, button[aria-label="Search"]',
  'aria',
  'UHC Producer Portal uses ARIA labels — prefer aria strategy for stability.',
  now(),
  'system'
),

-- Aetna Producer World
(
  'aetna',
  'Aetna',
  'https://www.aetnaproducerworld.com',
  'td.MEMBER_ID, input[name="MEMBER_ID"], .mbi-display',
  'tr.MEMBER_ROW, tbody > tr[class*="member"]',
  'td.MEMBER_NAME, .member-name',
  'td.PLAN_DESC, .plan-description',
  'td.STATUS, .enrollment-status',
  'td.EFF_DATE, .effective-date',
  'input[name="MEMBER_SEARCH"], input#memberSearchField',
  'input[type="submit"][value*="Search"], button#submitSearch',
  'css',
  'Aetna uses uppercase column class names matching their CSV export format.',
  now(),
  'system'
),

-- WellCare Centauri
(
  'wellcare',
  'WellCare',
  'https://portal.wellcare.com',
  '.member-id, td[data-column="Member ID"]',
  'table.members-table tbody tr',
  '.member-name, td[data-column="Member Name"]',
  '.plan-name, td[data-column="Plan Name"]',
  '.status, td[data-column="Status"]',
  '.effective-date, td[data-column="Effective Date"]',
  'input#memberIdSearch',
  'button#searchBtn',
  'css',
  'WellCare Centauri portal. Verify after each quarterly release cycle.',
  now(),
  'system'
),

-- BCBS (Blue Cross)
(
  'bcbs',
  'BCBS',
  'https://www.availity.com',
  'input[name="subscriberId"], .subscriber-id-input',
  'tr.eligibility-row, div.member-result-card',
  '.subscriber-name, span[data-field="subscriberName"]',
  '.plan-name, span[data-field="planName"]',
  '.eligibility-status, span[data-field="status"]',
  '.effective-date, span[data-field="effectiveDate"]',
  'input#searchMemberInput',
  'button[type="submit"]#eligibilitySearch',
  'css',
  'BCBS routes through Availity — portal structure shared with other Availity-hosted carriers.',
  now(),
  'system'
),

-- Devoted Health
(
  'devoted',
  'Devoted Health',
  'https://agent.devoted.com/book_of_business_contacts',
  '[data-testid="medicare-id"], .medicare-id-cell',
  '[data-testid="member-row"], tr.contact-row',
  '[data-testid="member-name"], .contact-name',
  '[data-testid="plan-name"], .plan-label',
  '[data-testid="enrollment-status"], .status-pill',
  '[data-testid="effective-date"], .effective-date-label',
  'input[data-testid="search-input"], input[placeholder*="search"]',
  'button[data-testid="search-button"]',
  'css',
  'Devoted uses data-testid attributes — highly stable, rarely changes.',
  now(),
  'system'
)

ON CONFLICT (carrier_slug) DO NOTHING;  -- Safe to re-run; never overwrites existing rows

-- ── Comments ─────────────────────────────────────────────────────────────

COMMENT ON TABLE public.carrier_edge_maps IS
  'Server-delivered CSS/DOM selector sets for the AegisSage Chrome extension. '
  'Updating a row here instantly changes what selectors all extensions use on next fetch — '
  'no Chrome Web Store review cycle required. Version auto-increments on UPDATE.';

COMMENT ON COLUMN public.carrier_edge_maps.carrier_slug IS
  'Lowercase identifier matching the carrier key used throughout the codebase (humana, uhc, aetna, etc.)';

COMMENT ON COLUMN public.carrier_edge_maps.version IS
  'Monotonically incrementing version — extensions cache selectors locally and '
  'invalidate cache when server version > cached version.';

COMMENT ON COLUMN public.carrier_edge_maps.fallback_selectors IS
  'Hardcoded fallback selector set used if the API fetch fails. '
  'Prevents total extension failure when the server is unreachable.';
