const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const { data: members, error } = await db
    .from('book_of_business')
    .select('id, last_known_plan_code, plan_name, carrier')
    .not('last_known_plan_code', 'is', null)

  if (error) { console.error('Failed to fetch members:', error.message); process.exit(1) }

  console.log(`Backfilling ${members.length} members...`)
  let updated = 0

  for (const member of members) {
    const code = member.last_known_plan_code
    const match = code?.match(/^([A-Z0-9]{4,6})-?(\d{1,3})/)
    if (!match) {
      console.log(`  Skipping (no parseable code): ${code}`)
      continue
    }
    const [, contract, pbpRaw] = match
    const pbp = pbpRaw.padStart(3, '0')

    const { data: plan } = await db
      .from('plan_pbp_directory')
      .select('plan_name, carrier_name, plan_type')
      .eq('contract', contract)
      .eq('pbp', pbp)
      .maybeSingle()

    if (plan) {
      const { error: updateErr } = await db
        .from('book_of_business')
        .update({
          plan_name:  plan.plan_name,
          carrier:    plan.carrier_name,
          plan_type:  plan.plan_type,
        })
        .eq('id', member.id)
      if (updateErr) {
        console.error(`  Update failed for ${code}:`, updateErr.message)
      } else {
        updated++
        console.log(`  Updated: ${code} → ${plan.plan_name} (${plan.carrier_name})`)
      }
    } else {
      console.log(`  No match in directory: ${contract}-${pbp}`)
    }
  }

  console.log(`\nDone. Updated ${updated}/${members.length} members.`)
}

main().catch(console.error)
