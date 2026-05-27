const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else current += char
  }
  result.push(current.trim())
  return result
}

async function main() {
  // Nested folder inside the zip extraction
  const csvPath = 'Monthly_Report_By_Plan_2026_05/Monthly_Report_By_Plan_2026_05/Monthly_Report_By_Plan_2026_05.csv'
  const text = fs.readFileSync(csvPath, 'latin1')
  const lines = text.split(/\r?\n/).filter(Boolean)
  console.log(`Total lines: ${lines.length}`)

  const rows = []
  const seen = new Set()

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 8) continue
    const contract = cols[0]?.replace(/"/g, '').trim()
    const pbpRaw   = cols[1]?.replace(/"/g, '').trim()
    if (!contract || !pbpRaw) continue
    const pbp = pbpRaw.padStart(3, '0')

    const key = `${contract}-${pbp}`
    if (seen.has(key)) continue
    seen.add(key)

    rows.push({
      contract,
      pbp,
      org_type:      cols[2]?.replace(/"/g, '').trim() || null,
      plan_type:     cols[3]?.replace(/"/g, '').trim() || null,
      offers_part_d: cols[4]?.replace(/"/g, '').trim() === 'Yes',
      carrier_name:  cols[6]?.replace(/"/g, '').trim() || null,
      plan_name:     cols[7]?.replace(/"/g, '').trim() || null,
      parent_org:    cols[8]?.replace(/"/g, '').trim() || null,
      enrollment:    cols[10]?.replace(/"/g, '').trim() || null,
      year:          2026,
    })
  }

  console.log(`Importing ${rows.length} unique plan/PBP combinations...`)

  let imported = 0
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const { error } = await db
      .from('plan_pbp_directory')
      .upsert(batch, { onConflict: 'contract,pbp', ignoreDuplicates: false })
    if (error) console.error(`Batch ${i} error:`, error.message)
    else imported += batch.length
    if (i % 500 === 0) console.log(`Progress: ${imported}/${rows.length}`)
  }
  console.log(`Done! Imported ${imported} plans.`)

  // Spot-check key Humana + UHC plans
  const { data } = await db
    .from('plan_pbp_directory')
    .select('contract, pbp, carrier_name, plan_name')
    .in('contract', ['H3359', 'H5141', 'H3152', 'H0423', 'H2001'])
    .limit(10)
  console.log('Sample:', JSON.stringify(data, null, 2))
}

main().catch(console.error)
