'use server'

import { supabaseAdmin } from '@/lib/supabase'

export async function autoProvisionUser({ userId, email }: { userId: string; email: string }) {
  // Check if agency already exists — idempotent
  const { data: existingAgency } = await supabaseAdmin
    .from('agencies')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle()

  if (existingAgency) {
    // Ensure broker row exists for this user
    const { data: existingBroker } = await supabaseAdmin
      .from('brokers')
      .select('agency_id, email')
      .eq('user_id', userId)
      .maybeSingle()

    if (!existingBroker) {
      await supabaseAdmin.from('brokers').insert({
        agency_id: existingAgency.id,
        user_id: userId,
        email,
        first_name: email.split('@')[0],
        last_name: '',
        npn: null,
        role: 'agency_owner',
      })
    } else if (email && !existingBroker.email) {
      await supabaseAdmin.from('brokers').update({ email }).eq('user_id', userId)
    }

    return { agencyId: existingBroker?.agency_id ?? existingAgency.id }
  }

  const name = email.split('@')[0]

  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('agencies')
    .insert({
      owner_id: userId,
      name: `${name}'s Agency`,
      status: 'trial',
      tier: 'starter',
    })
    .select('id')
    .single()

  if (agencyError) throw new Error(`Failed to create agency: ${agencyError.message}`)

  const { error: brokerError } = await supabaseAdmin.from('brokers').insert({
    agency_id: agency.id,
    user_id: userId,
    email,
    first_name: name,
    last_name: '',
    npn: null,
    role: 'agency_owner',
  })

  if (brokerError) throw new Error(`Failed to create broker: ${brokerError.message}`)

  return { agencyId: agency.id }
}
