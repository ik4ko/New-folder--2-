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
  const isAgency = params.role === 'agency_owner'
  const displayName = params.agencyName?.trim() || `${params.firstName} ${params.lastName}`

  console.log('[provisionAgency] starting provisioning:', {
    userId:      params.userId,
    role:        params.role,
    plan:        isAgency ? 'agency' : 'broker',
    billingPlan: params.billingPlan,
    displayName,
  })

  const { data: agency, error: agencyError } = await supabaseAdmin
    .from('agencies')
    .insert({
      owner_id: params.userId,
      name: displayName,
      // status/tier are the original core-schema columns (kept for backward compat)
      status: 'trial',
      tier: isAgency ? 'agency' : 'starter',
      // subscription_tier drives billing-page plan detection and dashboard view
      // Valid values (from 20260514040000_beta_and_billing migration):
      //   'trial' | 'beta' | 'broker' | 'agency' | 'enterprise'
      subscription_tier: isAgency ? 'agency' : 'broker',
      // seat_limit / included_seats added in 20260528080000_seat_enforcement
      // Agency plan: null seat_limit (unlimited), 5 included seats
      // Broker plan: 1 seat_limit (hard cap),     1 included seat
      seat_limit:     isAgency ? null : 1,
      included_seats: isAgency ? 5    : 1,
    })
    .select('id')
    .single()

  if (agencyError) {
    console.error('[provisionAgency] agency insert error:', agencyError)
    throw new Error(`Failed to create agency: ${agencyError.message}`)
  }

  console.log('[provisionAgency] agency row created:', {
    agencyId:         agency.id,
    subscription_tier: isAgency ? 'agency' : 'broker',
    included_seats:    isAgency ? 5 : 1,
  })

  const { error: brokerError } = await supabaseAdmin
    .from('brokers')
    .insert({
      agency_id:  agency.id,
      user_id:    params.userId,
      first_name: params.firstName,
      last_name:  params.lastName,
      npn:        null,
      // role values validated by brokers_role_check constraint
      // (agency_owner | agency_admin | customer_service | broker | solo_broker)
      role: params.role === 'agency_owner' ? 'agency_owner' : 'solo_broker',
    })

  if (brokerError) {
    console.error('[provisionAgency] broker insert error:', brokerError)
    throw new Error(`Failed to create broker record: ${brokerError.message}`)
  }

  console.log('[provisionAgency] broker row created:', {
    role: params.role === 'agency_owner' ? 'agency_owner' : 'solo_broker',
  })

  await supabaseAdmin.from('audit_log').insert({
    agency_id:     agency.id,
    user_id:       params.userId,
    action:        'AGENCY_PROVISIONED',
    resource_type: 'agency',
    resource_id:   agency.id,
    metadata: {
      role:             params.role,
      billingPlan:      params.billingPlan,
      tpmoCertifiedAt:  params.tpmoCertifiedAt,
      subscription_tier: isAgency ? 'agency' : 'broker',
    },
  })

  return { agencyId: agency.id }
}
