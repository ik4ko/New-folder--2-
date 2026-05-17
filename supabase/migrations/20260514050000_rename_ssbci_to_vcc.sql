-- Rename ssbci tables to vcc
ALTER TABLE IF EXISTS ssbci_submissions RENAME TO vcc_submissions;
ALTER TABLE IF EXISTS ssbci_form_templates RENAME TO vcc_form_templates;

-- Update any sequences/indexes that reference old names (Postgres renames these automatically)
-- Rename storage bucket path references are handled at app level

-- Update RLS policy names if needed (policies stay attached to renamed table)
-- No manual action needed for RLS — policies follow the table rename automatically
