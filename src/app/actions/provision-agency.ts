'use server'

import { supabaseAdmin } from '@/lib/supabase'

interface ProvisionParams {
  userId: string
  firstName: string
  lastName: string
  agencyName: string | null
  phone: string
  role: 'solo_broker' | 'agency_owner'
  tpmoCertifiedAt: string
  billingPlan: string
}

export async function provisionAgency(params: ProvisionParams) {
  const displayName = params.agencyName?.trim() || `${params.firstName} ${params.lastName}`

  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('agencies')
    .insert({
      owner_id: params.userId,
      name: displayName,
      status: 'trial',
      tier: 'starter',
    })
    .select('id')
    .single()

  if (agencyError) {
    console.error('[provisionAgency] agency insert error:', agencyError)
    throw new Error(`Failed to create agency: ${agencyError.message}`)
  }

  const { error: brokerError } = await supabaseAdmin
    .from('brokers')
    .insert({
      agency_id: agency.id,
      user_id: params.userId,
      first_name: params.firstName,
      last_name: params.lastName,
      npn: null,
      role: params.role === 'agency_owner' ? 'agency_owner' : 'solo_broker',
    })

  if (brokerError) {
    console.error('[provisionAgency] broker insert error:', brokerError)
    throw new Error(`Failed to create broker record: ${brokerError.message}`)
  }

  await supabaseAdmin.from('audit_log').insert({
    agency_id: agency.id,
    user_id: params.userId,
    action: 'AGENCY_PROVISIONED',
    resource_type: 'agency',
    resource_id: agency.id,
    metadata: {
      role: params.role,
      billingPlan: params.billingPlan,
      tpmoCertifiedAt: params.tpmoCertifiedAt,
    },
  })

  return { agencyId: agency.id }
}
