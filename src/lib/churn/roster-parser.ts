import * as XLSX from 'xlsx'
import { createHash } from 'crypto'

export interface RosterRow {
  member_id?: string
  full_name: string
  dob?: string
  effective_date?: string
  plan_name?: string
  plan_id?: string
  status?: string
  raw: Record<string, unknown>
}

export function normalizeStr(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '')
}

export function hashName(name: string, dob?: string): string {
  return createHash('sha256')
    .update(`${normalizeStr(name)}|${dob ?? ''}`)
    .digest('hex')
}

// Carrier-specific column name maps
const CARRIER_COLUMNS: Record<string, Record<string, string>> = {
  humana: {
    full_name:      'Member Name',
    member_id:      'Member ID',
    plan_name:      'Plan Name',
    effective_date: 'Effective Date',
    dob:            'Date of Birth',
    status:         'Status',
  },
  uhc: {
    full_name:      'Full Name',
    member_id:      'MemberID',
    plan_name:      'Product',
    effective_date: 'EffDate',
    dob:            'DOB',
    status:         'Status',
  },
  aetna: {
    full_name:      'MEMBER_NAME',
    member_id:      'MEMBER_ID',
    plan_name:      'PLAN_DESC',
    effective_date: 'EFF_DATE',
    dob:            'DOB',
    status:         'STATUS',
  },
  wellcare: {
    full_name:      'Member Name',
    member_id:      'Member ID',
    plan_name:      'Plan Name',
    effective_date: 'Effective Date',
    dob:            'DOB',
    status:         'Status',
  },
  bcbs: {
    full_name:      'SUBSCRIBER_NAME',
    member_id:      'SUBSCRIBER_ID',
    plan_name:      'PLAN_NAME',
    effective_date: 'EFFECTIVE_DATE',
    dob:            'DATE_OF_BIRTH',
    status:         'STATUS',
  },
  cigna: {
    full_name:      'Member Name',
    member_id:      'Member ID',
    plan_name:      'Plan',
    effective_date: 'Effective Date',
    dob:            'DOB',
    status:         'Status',
  },
}

function detectColumns(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const h of headers) {
    const l = h.toLowerCase()
    if (!map.full_name      && (l.includes('name') && !l.includes('plan')))         map.full_name      = h
    if (!map.member_id      && (l.includes('memberid') || l === 'id' || (l.includes('member') && l.includes('id')))) map.member_id = h
    if (!map.plan_name      && (l.includes('plan') || l.includes('product') || l.includes('desc'))) map.plan_name = h
    if (!map.effective_date && (l.includes('eff') || l.startsWith('effective')))    map.effective_date = h
    if (!map.dob            && (l === 'dob' || l.includes('birth') || l.includes('birthdate'))) map.dob = h
    if (!map.status         && l === 'status')                                       map.status         = h
  }
  // Last resort: first column = name
  if (!map.full_name && headers.length > 0) map.full_name = headers[0]
  return map
}

function extractValue(row: Record<string, unknown>, col: string | undefined): string {
  if (!col) return ''
  return String(row[col] ?? '').trim()
}

export function parseRosterFile(buffer: ArrayBuffer, carrier: string): RosterRow[] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  if (rows.length === 0) return []

  const headers = Object.keys(rows[0])
  const carrierKey = carrier.toLowerCase()
  const colMap = CARRIER_COLUMNS[carrierKey] ?? detectColumns(headers)

  return rows.reduce<RosterRow[]>((acc, row) => {
    const name = extractValue(row, colMap.full_name)
    if (!name) return acc

    acc.push({
      member_id:      extractValue(row, colMap.member_id) || undefined,
      full_name:      name,
      dob:            extractValue(row, colMap.dob) || undefined,
      effective_date: extractValue(row, colMap.effective_date) || undefined,
      plan_name:      extractValue(row, colMap.plan_name) || undefined,
      plan_id:        undefined,
      status:         extractValue(row, colMap.status) || undefined,
      raw:            row,
    })
    return acc
  }, [])
}
