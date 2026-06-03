import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Diagnostic endpoint — remove after confirming the migration has run.
// Protected: requires Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>

const AGENCIES_COLUMNS = ['subscription_tier', 'seat_limit', 'included_seats', 'billing_cycle'] as const
const BROKERS_COLUMNS  = ['role'] as const

async function columnExists(
  admin: ReturnType<typeof createServiceClient>,
  table: string,
  column: string
): Promise<boolean> {
  // PostgREST returns error code '42703' when a column does not exist.
  const { error } = await (admin as any).from(table).select(column).limit(0)
  if (!error) return true
  // code '42703' = undefined_column in PostgreSQL
  return error.code !== '42703' && !error.message?.toLowerCase().includes('does not exist')
}

export async function GET(request: NextRequest) {
  // Service-role-only guard
  const authHeader = request.headers.get('authorization')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = createServiceClient()

  const results: Record<string, Record<string, boolean>> = {
    agencies: {},
    brokers:  {},
  }

  for (const col of AGENCIES_COLUMNS) {
    results.agencies[col] = await columnExists(admin, 'agencies', col)
  }
  for (const col of BROKERS_COLUMNS) {
    results.brokers[col] = await columnExists(admin, 'brokers', col)
  }

  const missing = {
    agencies: AGENCIES_COLUMNS.filter(c => !results.agencies[c]),
    brokers:  BROKERS_COLUMNS.filter(c => !results.brokers[c]),
  }

  const allPresent = missing.agencies.length === 0 && missing.brokers.length === 0

  return NextResponse.json({
    status:    allPresent ? 'ok' : 'migration_required',
    allPresent,
    columns:   results,
    missing,
    action:    allPresent
      ? 'No action needed. All columns exist.'
      : `Run supabase/migrations/20260603000002_missing_columns.sql in the Supabase SQL editor.`,
  })
}
