import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Fuzzy alias map ───────────────────────────────────────────────────────────

const ALIAS_MAP: Record<string, string[]> = {
  mbi: [
    'mbi', 'medicare id', 'medicare number', 'medicare beneficiary identifier',
    'medicare beneficiary id', 'claim no', 'claim number', 'member id',
    'subscriber id', 'beneficiary id', 'hic number', 'hicn',
    'medicare #', 'medicare no', 'medicaid id', 'insurance id',
    'id number', 'policy number', 'policy #', 'policy no',
    'beneficiary identifier', 'medicare identifier',
    'mbi number', 'mbi #', 'medicare_id', 'member_id',
    'beneficiary_id', 'medicare id number', 'hic', 'claim_no', 'bene id', 'bene_id',
  ],
  full_name: [
    'name', 'full name', 'fullname', 'full_name', 'client name', 'beneficiary',
    'member name', 'patient name', 'insured name', 'policyholder',
    'member', 'insured', 'subscriber name', 'subscriber',
    'client', 'consumer name', 'participant name',
    'member_name', 'client_name', 'beneficiary_name',
    'patient', 'enrollee', 'enrollee name', 'covered person',
  ],
  first_name: [
    'first name', 'firstname', 'first', 'fname', 'given name',
    'given', 'first_name', 'f name', 'member first name',
    'beneficiary first name', 'patient first name',
  ],
  last_name: [
    'last name', 'lastname', 'last', 'lname', 'surname',
    'family name', 'last_name', 'l name', 'member last name',
    'beneficiary last name', 'patient last name',
  ],
  plan_code: [
    'plan', 'plan name', 'plan code', 'plan id', 'planid', 'plan_id', 'plan_name',
    'contract', 'contract id', 'contract number', 'pbp',
    'benefit package', 'product', 'product code', 'coverage',
    'insurance plan', 'health plan', 'plan type', 'program',
    'sunfire', 'carrier plan', 'plan description', 'plan title',
    'current plan', 'enrolled plan', 'insurance product',
    'new plan', 'new_plan', 'plan change', 'switching to',
    'new coverage', 'updated plan', 'plan effective',
    'plan enrollment', 'enrollment plan', 'ma plan',
    'ma plan name', 'medicare plan', 'medicare advantage plan',
    'advantage plan', 'mapd plan', 'mapd', 'hmo plan',
    'ppo plan', 'd-snp plan', 'snp plan',
  ],
  carrier: [
    'carrier', 'insurance company', 'insurer', 'company',
    'insurance carrier', 'health plan', 'payer', 'payer name',
    'insurance', 'provider', 'insurance provider', 'plan sponsor',
    'carrier name', 'insurance_carrier', 'plan issuer', 'issuer', 'organization',
  ],
  is_chronic: [
    'is_chronic', 'chronic', 'dsnp', 'd-snp', 'dual eligible',
    'dual', 'snp', 'chronic plan', 'special needs',
  ],
}

function sanitizeMbi(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').trim().slice(0, 11)
  // CMS MBI standard: 11 characters exactly, minimum 9 after stripping formatting.
  // Reject short garbage values ('NA', 'REF', '123', etc.) that pass a truthiness
  // check but are not valid Medicare Beneficiary Identifiers.
  return clean.length >= 9 ? clean : ''
}

function resolveHeader(rawHeader: string): string | null {
  const normalized = rawHeader.toLowerCase().trim()
  for (const [field, aliases] of Object.entries(ALIAS_MAP)) {
    if (aliases.includes(normalized)) return field
  }
  return null
}

function buildColumnMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  headers.forEach((h, i) => {
    const field = resolveHeader(h)
    if (field && !(field in map)) map[field] = i
  })
  return map
}

function detectColumnsByContent(
  headers: string[],
  rows: string[][],
  onlyFields: string[] = Object.keys(ALIAS_MAP)
): Record<string, number> {
  const sampleRows = rows.slice(0, 10)
  const detected: Record<string, number> = {}

  headers.forEach((_, colIndex) => {
    const values = sampleRows
      .map(r => (r[colIndex] ?? '').trim())
      .filter(Boolean)

    if (values.length === 0) return

    if (onlyFields.includes('mbi')) {
      const mbiMatches = values.filter(v =>
        /^[A-Z0-9]{9,11}$/.test(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))
      ).length
      if (mbiMatches / values.length > 0.7 && !('mbi' in detected)) {
        detected['mbi'] = colIndex
      }
    }

    if (onlyFields.includes('full_name')) {
      const nameMatches = values.filter(v =>
        /^[A-Za-z\s\-'.]{4,}$/.test(v) && v.includes(' ')
      ).length
      if (nameMatches / values.length > 0.7 && !('full_name' in detected)) {
        detected['full_name'] = colIndex
      }
    }

    if (onlyFields.includes('plan_code')) {
      const planMatches = values.filter(v =>
        /^[HSE]\d{4}/i.test(v.trim())
      ).length
      if (planMatches / values.length > 0.5 && !('plan_code' in detected)) {
        detected['plan_code'] = colIndex
      }
    }
  })

  return detected
}

const CARRIER_KEYWORDS: [string, string][] = [
  // ── Explicit brand/sub-brand mappings ────────────────────────────────────
  ['peoples health', 'UnitedHealthcare'],   // Peoples Health Network → UHC
  ['carecomplete',   'Humana'],             // CareComplete → Humana
  // ── Standard carrier keywords ────────────────────────────────────────────
  ['humana',        'Humana'],
  ['aetna',         'Aetna Medicare'],
  ['clover',        'Clover Health'],
  ['devoted',       'Devoted Health'],
  ['uhc',           'UnitedHealthcare'],
  ['united',        'UnitedHealthcare'],
  ['wellcare',      'Wellcare'],
  ['anthem',        'Anthem'],
  ['wellpoint',     'Anthem'],
  ['healthfirst',   'Healthfirst Medicare Plan'],
  ['health first',  'Healthfirst Medicare Plan'],
  ['bcbs',          'BCBS'],
  ['blue cross',    'BCBS'],
  ['cigna',         'Cigna'],
  ['carefree',      'Cigna'],
  ['healthspring',  'Cigna'],
  ['kaiser',        'Kaiser Permanente'],
  ['molina',        'Molina Healthcare'],
  ['centene',       'Centene'],
  ['aarp',          'UnitedHealthcare'],
  ['silverscript',  'CVS/Silverscript'],
  ['elevance',      'Elevance Health'],
]

/**
 * RFC 4180-compliant CSV parser.
 * Handles quoted fields (which may contain commas and newlines),
 * escaped double-quotes (""), and CRLF/LF line endings.
 * The naive split-on-comma approach breaks whenever Google Sheets
 * wraps any cell that contains a comma (e.g. "Smith, John",
 * "Devoted Health, Medicare Plans"), shifting every subsequent
 * column index and causing MBI/carrier detection to fail.
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  let i = 0

  // Normalize line endings
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  while (i < s.length) {
    const ch = s[i]

    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead: "" means escaped quote inside quoted field
        if (s[i + 1] === '"') {
          cell += '"'
          i += 2
        } else {
          // Closing quote — exit quoted mode
          inQuotes = false
          i++
        }
      } else {
        cell += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ',') {
        row.push(cell.trim())
        cell = ''
        i++
      } else if (ch === '\n') {
        row.push(cell.trim())
        cell = ''
        // Only push non-empty rows (skip blank lines)
        if (row.some(c => c !== '')) rows.push(row)
        row = []
        i++
      } else {
        cell += ch
        i++
      }
    }
  }

  // Flush final cell/row
  row.push(cell.trim())
  if (row.some(c => c !== '')) rows.push(row)

  return rows
}

async function fetchSheetCSV(url: string): Promise<string> {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) throw new Error('Invalid Google Sheets URL. Please use the full URL from your browser address bar.')

  const sheetId = idMatch[1]
  const gidMatch = url.match(/[?&#]gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : '0'

  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`

  const res = await fetch(csvUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })

  if (res.status === 401 || res.status === 403) {
    throw new Error('Cannot access this Google Sheet. Please set it to "Anyone with the link can view" in Share settings.')
  }
  if (res.status === 404) {
    throw new Error('Google Sheet not found. Please check the URL.')
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch Google Sheet (status ${res.status}). Make sure the sheet is publicly accessible.`)
  }

  const text = await res.text()

  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    throw new Error('This Google Sheet is not publicly accessible. Go to Share → Change to "Anyone with the link" → Viewer.')
  }

  return text
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (!user || userError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let broker: { id: string; agency_id: string } | null = null
  const { data: brokerData } = await supabase
    .from('brokers')
    .select('id, agency_id')
    .eq('user_id', user.id)
    .maybeSingle()
  broker = brokerData as { id: string; agency_id: string } | null

  if (!broker) {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const serviceSupabase = createServiceClient()
    const { data: brokerFallback } = await serviceSupabase
      .from('brokers')
      .select('id, agency_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!brokerFallback) {
      return NextResponse.json({ error: 'Broker not found' }, { status: 403 })
    }
    broker = brokerFallback as { id: string; agency_id: string }
  }

  let csvText: string
  try {
    const body = await req.json()
    if (!body.sheetsUrl) {
      return NextResponse.json({ error: 'sheetsUrl is required' }, { status: 400 })
    }
    csvText = await fetchSheetCSV(body.sheetsUrl)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to parse request' },
      { status: 400 }
    )
  }

  const rows = parseCSV(csvText)
  if (rows.length < 2) {
    return NextResponse.json({ error: 'Sheet appears empty' }, { status: 400 })
  }

  const headers = rows[0]
  const dataRows = rows.slice(1)

  const aliasMap = buildColumnMap(headers)
  const missingFields = Object.keys(ALIAS_MAP).filter(f => aliasMap[f] === undefined)
  const contentMap = detectColumnsByContent(headers, dataRows, missingFields)
  const colMap = { ...contentMap, ...aliasMap }

  const records: object[] = []
  let dropped = 0
  // Rejected rows are persisted to roster_upload_errors so brokers have a
  // clear review trail of which rows failed and why — mirrors /api/roster/upload
  const rejectedRows: Array<{ row_index: number; reason: string; raw_data: Record<string, string> }> = []

  for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
    const row = dataRows[rowIdx]
    if (row.every(cell => !cell.trim())) continue

    const get = (field: string) =>
      colMap[field] !== undefined ? (row[colMap[field]] ?? '').trim() : ''

    const rawMbi = get('mbi')
    const mbi = sanitizeMbi(rawMbi)
    if (!mbi) {
      dropped++
      const rawDataSnap: Record<string, string> = {}
      headers.forEach((h, i) => { rawDataSnap[h] = row[i] ?? '' })
      rejectedRows.push({
        row_index: rowIdx + 2, // +2 = 1-based row index + header row
        reason: rawMbi
          ? `MBI "${rawMbi}" is invalid (must be 9–11 alphanumeric chars after sanitization)`
          : 'MBI column is empty or could not be resolved from this row',
        raw_data: rawDataSnap,
      })
      continue
    }

    const firstName = get('first_name')
    const lastName  = get('last_name')
    const combined  = [firstName, lastName].filter(Boolean).join(' ').trim()
    let fullName    = combined || get('full_name') || null
    if (fullName) {
      const commaMatch = fullName.match(/^([^,]+),\s*(.+)$/)
      if (commaMatch) fullName = `${commaMatch[2].trim()} ${commaMatch[1].trim()}`
    }

    // Raw plan value — carrier inference and H-code extraction both use this
    const planValue = get('plan_code') || ''

    // Extract H-code (word-boundary so it works when embedded in plan name)
    const contractPbpMatch = planValue.match(/\b([A-Z]\d{4})-(\d{3})\b/)
    const planContract = contractPbpMatch?.[1] ?? null
    const planPbp = contractPbpMatch?.[2]?.padStart(3, '0') ?? null
    const extractedPlanId = planContract && planPbp ? `${planContract}-${planPbp}` : null

    // Strip trailing H-code suffix to get a clean human-readable plan name
    const cleanedPlanName = planValue
      .replace(/\s+[A-Z]\d{4}-\d{3}-?\d{0,3}\s*$/, '').trim() || null

    // Carrier: explicit column first, then infer from plan name string
    let resolvedCarrier = 'unknown'
    const carrierValue = get('carrier') || ''
    if (carrierValue) {
      const cl = carrierValue.toLowerCase()
      for (const [kw, name] of CARRIER_KEYWORDS) {
        if (cl.includes(kw)) { resolvedCarrier = name; break }
      }
    }
    if (resolvedCarrier === 'unknown' && planValue) {
      const pl = planValue.toLowerCase()
      for (const [kw, name] of CARRIER_KEYWORDS) {
        if (pl.includes(kw)) { resolvedCarrier = name; break }
      }
    }

    const planLower = planValue.toLowerCase()
    const isChronicFromPlan =
      planLower.includes('d-snp') || planLower.includes('c-snp') ||
      planLower.includes('i-snp') || planLower.includes('dsnp') ||
      planLower.includes('dual') || planLower.includes('special needs') ||
      planLower.includes('chronic')
    const isChronicFromColumn = ['yes', 'true', '1', 'y'].includes((get('is_chronic') || '').toLowerCase())

    records.push({
      mbi,
      mbi_encrypted:        mbi,
      member_id:            mbi,
      has_mbi:              true,
      agency_id:            broker.agency_id,
      broker_id:            broker.id,
      synced_by:            user.id,
      full_name:            fullName,
      plan_name:            cleanedPlanName,
      plan_id:              extractedPlanId,
      plan_contract:        planContract,
      plan_pbp:             planPbp,
      carrier:              resolvedCarrier,
      carrier_display_name: resolvedCarrier !== 'unknown' ? resolvedCarrier : null,
      status:               'active',
      verification_status:  'unverified',
      enrollment_status:    'active',
      is_chronic:           isChronicFromColumn || isChronicFromPlan,
      last_verified_at:     new Date().toISOString(),
      updated_at:           new Date().toISOString(),
    })
  }

  if (records.length === 0) {
    return NextResponse.json(
      { error: `No valid records found. ${dropped} rows dropped (missing or invalid MBI).` },
      { status: 422 }
    )
  }

  const typedRecords = records as Array<Record<string, unknown>>

  // Deduplicate by mbi — keep last occurrence (most complete data wins)
  const deduped: Record<string, unknown>[] = Object.values(
    typedRecords.reduce<Record<string, Record<string, unknown>>>((acc, record) => {
      const key = `${record.mbi}-${record.agency_id}`
      acc[key] = record
      return acc
    }, {})
  )
  const duplicateCount = typedRecords.length - deduped.length

  const mbiCount = deduped.length
  const planCount = deduped.filter(r => (r as Record<string, unknown>).plan_name).length
  const carrierCount = deduped.filter(r => (r as Record<string, unknown>).carrier !== 'unknown').length

  const { error: upsertError } = await supabase
    .from('book_of_business')
    .upsert(deduped, { onConflict: 'mbi,agency_id', ignoreDuplicates: false })

  if (upsertError) {
    console.error('[sheets-import] upsert error:', JSON.stringify(upsertError))
    return NextResponse.json(
      { error: upsertError.message, detail: upsertError.details, hint: upsertError.hint },
      { status: 500 }
    )
  }

  // Persist rejected rows to roster_upload_errors so brokers can review and
  // correct them without losing track of which members were silently skipped.
  if (rejectedRows.length > 0) {
    const errorInserts = rejectedRows.map(r => ({
      agency_id:     broker.agency_id,
      upload_source: 'sheets_import',
      row_index:     r.row_index,
      reason:        r.reason,
      raw_data:      r.raw_data,
    }))
    const { error: errTableErr } = await supabase
      .from('roster_upload_errors')
      .insert(errorInserts)
    if (errTableErr) {
      // Non-fatal — the import itself succeeded; log but don't fail the response
      console.error('[sheets-import] failed to persist rejected rows:', errTableErr.message)
    }
  }

  return NextResponse.json({
    imported: deduped.length, dropped, mbiCount, planCount, carrierCount,
    ...(duplicateCount > 0 && {
      duplicates: duplicateCount,
      message: `${duplicateCount} duplicate MBI entries were merged`,
    }),
    ...(rejectedRows.length > 0 && {
      rejectedCount: rejectedRows.length,
      message_errors: `${rejectedRows.length} row(s) had invalid or missing MBIs and were logged for review`,
    }),
  })
}