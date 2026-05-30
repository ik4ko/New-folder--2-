import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { TeamManagement } from './team-management'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, subscription_tier')
    .eq('owner_id', user.id)
    .maybeSingle()

  let agencyId: string | null = agency?.id ?? null
  const isOwner = !!agency
  const agencyTier = agency?.subscription_tier ?? 'broker'

  if (!agencyId) {
    const { data: broker } = await supabase
      .from('brokers')
      .select('agency_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!broker || !['agency_admin', 'agency_owner', 'customer_service'].includes(broker.role ?? '')) redirect('/dashboard')
    agencyId = broker.agency_id
  }

  const { data: brokers } = await supabaseAdmin
    .from('brokers')
    .select('id, user_id, first_name, last_name, email, role, npn, created_at')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })

  const { data: contactRows } = await supabaseAdmin
    .from('ghl_contacts')
    .select('assigned_broker_id')
    .eq('agency_id', agencyId)
    .not('assigned_broker_id', 'is', null)

  const countMap: Record<string, number> = {}
  contactRows?.forEach(c => {
    if (c.assigned_broker_id) countMap[c.assigned_broker_id] = (countMap[c.assigned_broker_id] ?? 0) + 1
  })

  const brokersWithCounts = (brokers ?? []).map(b => ({
    ...b,
    assignedCount: countMap[b.user_id] ?? 0,
  }))

  // Fetch pending invites (non-fatal if table doesn't exist)
  let pendingInvites: Array<{ id: string; email: string; role: string; created_at: string; expires_at: string }> = []
  try {
    const { data: invites } = await supabaseAdmin
      .from('agency_invites')
      .select('id, email, role, created_at, expires_at')
      .eq('agency_id', agencyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    pendingInvites = invites ?? []
  } catch (_) {}

  return (
    <TeamManagement
      brokers={brokersWithCounts}
      agencyId={agencyId}
      isOwner={isOwner}
      pendingInvites={pendingInvites}
      agencyTier={agencyTier}
    />
  )
}
