-- The alerts list page and scripts page select previous_carrier, new_carrier,
-- estimated_revenue_at_risk from switch_alerts — none existed, so PostgREST
-- rejected the whole query and the alerts page would render EMPTY even after
-- alert rows were successfully inserted (third instance of the
-- missing-column/empty-page failure class).
-- (Applied to production 2026-06-10 via MCP as add_switch_alerts_ui_columns.)
ALTER TABLE public.switch_alerts
  ADD COLUMN IF NOT EXISTS previous_carrier          text,
  ADD COLUMN IF NOT EXISTS new_carrier               text,
  ADD COLUMN IF NOT EXISTS estimated_revenue_at_risk numeric;
