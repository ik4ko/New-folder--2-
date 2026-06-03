// Supabase user data wipe script
// Dry-run by default. Execute wipe only with --confirm flag.
//
// Run (dry-run): npx tsx scripts/wipe-users.ts
// Run (execute): npx tsx scripts/wipe-users.ts --confirm

import { createClient } from '@supabase/supabase-js';

// Load .env.local for local dev; no-op if dotenv not installed
try { (require as any)('dotenv').config({ path: '.env.local' }); } catch {}

const DRY_RUN = !process.argv.includes('--confirm');
const SUPABASE_URL = 'https://sxqdjilabbmjobjpwwst.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SERVICE_KEY) {
  console.error('[wipe] SUPABASE_SERVICE_ROLE_KEY is not set. Aborting.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Delete order: child/leaf tables first to respect foreign-key constraints.
const TABLE_ORDER: string[] = [
  // audit / log tables (reference agencies — delete first)
  'audit_log',
  // compliance_audit_logs — does not exist in DB schema, omitted
  // enterprise_audit_logs — does not exist in DB schema, omitted
  'detection_audit_log',
  'alert_delivery_log',
  'member_detection_log',
  'carrier_false_positive_tracker',
  'sync_results',
  // waitlist — migration pending, add back after
  // supabase/migrations/20260603000000_waitlist.sql is applied
  // roster pipeline
  'roster_upload_errors',   // references roster_uploads
  'roster_members',
  'roster_uploads',
  // book of business / contacts
  'book_of_business',
  'ghl_contacts',
  // forms & submissions
  'vcc_submissions',
  'aor_submissions',
  // VCC-filled  — Storage bucket, not a Postgres table, omitted
  // vcc-templates — Storage bucket, not a Postgres table, omitted
  'vcc_form_templates',
  // campaigns
  'campaign_enrollments',
  'campaign_templates',
  // retention / alerts
  'retention_events',
  'switch_alerts',
  'aep_schedule',
  'escalation_timers',
  // carrier data
  'carrier_logins',
  // agency_credentials — primary key column unknown; omitted to avoid incorrect
  // bulk delete. Inspect schema (SELECT column_name FROM information_schema.columns
  // WHERE table_name = 'agency_credentials') before adding back.
  'carrier_baselines',
  'carrier_schema_maps',
  // misc
  'background_job_queue',
  // csv-uploads — Storage bucket, not a Postgres table, omitted
  // phi-vault   — Storage bucket, not a Postgres table, omitted
  // root rows last (brokers before agencies)
  'brokers',
  'agencies',
];

// Paginate through all auth users (default cap is 1 000 per page)
async function fetchAllAuthUsers(): Promise<{ id: string; email?: string }[]> {
  const users: { id: string; email?: string }[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
    page++;
  }
  return users;
}

async function main() {
  // ── Dry run ──────────────────────────────────────────────────────────────
  if (DRY_RUN) {
    console.log('\n── DRY RUN (no changes will be made) ────────────────────────────\n');
    console.log('Tables that would be cleared (in order):');
    TABLE_ORDER.forEach((t, i) =>
      console.log(`  ${String(i + 1).padStart(2, ' ')}. ${t}`)
    );

    try {
      const users = await fetchAllAuthUsers();
      console.log(`\nAuth users that would be deleted (${users.length}):`);
      users.forEach(u => console.log(`  - ${u.email ?? u.id}`));
    } catch (e: any) {
      console.log(`\nCould not fetch auth users: ${e.message}`);
    }

    console.log('\nRe-run with --confirm to execute the wipe.\n');
    return;
  }

  // ── Live wipe ─────────────────────────────────────────────────────────────
  console.log('\n⚠️  EXECUTING WIPE — irreversible\n');
  console.log('Clearing tables...');

  const cleared: string[] = [];
  const tableErrors: string[] = [];

  for (const table of TABLE_ORDER) {
    try {
      // PostgREST requires a WHERE clause for bulk deletes.
      // `not('id', 'is', null)` is always true for any non-null PK.
      const { error } = await (admin as any).from(table).delete().not('id', 'is', null);
      if (error) {
        tableErrors.push(`${table}: ${error.message}`);
        console.log(`  ✗ ${table} — ${error.message}`);
      } else {
        cleared.push(table);
        console.log(`  ✓ ${table}`);
      }
    } catch (e: any) {
      tableErrors.push(`${table}: ${e.message}`);
      console.log(`  ✗ ${table} — ${e.message}`);
    }
  }

  // ── Auth users ────────────────────────────────────────────────────────────
  const deletedEmails: string[] = [];
  const authErrors: string[] = [];
  let allUsers: { id: string; email?: string }[] = [];

  try {
    allUsers = await fetchAllAuthUsers();
  } catch (e: any) {
    authErrors.push(`listUsers: ${e.message}`);
    console.log(`\n✗ Could not list auth users: ${e.message}`);
  }

  console.log(`\nDeleting ${allUsers.length} auth user(s)...`);
  for (const user of allUsers) {
    const label = user.email ?? user.id;
    console.log(`  Deleting ${label}...`);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      authErrors.push(`deleteUser(${label}): ${error.message}`);
      console.log(`    ✗ ${error.message}`);
    } else {
      deletedEmails.push(label);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const allErrors = [...tableErrors, ...authErrors];
  console.log('\n' + '═'.repeat(60));
  console.log('WIPE SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Tables cleared     (${cleared.length}/${TABLE_ORDER.length}): ${cleared.join(', ') || 'none'}`);
  console.log(`Auth users deleted (${deletedEmails.length}/${allUsers.length}): ${deletedEmails.join(', ') || 'none'}`);
  if (allErrors.length) {
    console.log(`\nErrors (${allErrors.length}):`);
    allErrors.forEach(e => console.log(`  ✗ ${e}`));
  } else {
    console.log('\n✓ No errors.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
