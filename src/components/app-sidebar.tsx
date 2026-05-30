import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SidebarNav } from './sidebar-nav'

export async function AppSidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: agency }, { data: brokerRow }] = await Promise.all([
    supabase.from('agencies').select('id, subscription_tier').eq('owner_id', user.id).maybeSingle(),
    supabase.from('brokers').select('id, role, agency_id, first_name, last_name').eq('user_id', user.id).maybeSingle(),
  ])

  const staffRoles = ['agency_owner', 'agency_admin', 'customer_service']
  const isStaff = staffRoles.includes(brokerRow?.role ?? '')
  const agencyId = agency?.id ?? brokerRow?.agency_id
  const role = brokerRow?.role ?? 'broker'
  // 'broker' tier = Solo $149 plan; 'agency' = multi-seat plan.
  // Non-owners default to 'broker' tier (safest restrictive default).
  const tier = agency?.subscription_tier ?? 'broker'
  const name = brokerRow
    ? `${brokerRow.first_name ?? ''} ${brokerRow.last_name ?? ''}`.trim() || (user.email?.split('@')[0] ?? 'User')
    : (user.email?.split('@')[0] ?? 'User')
  const email = user.email ?? ''

  let criticalAlerts = 0
  if (agencyId) {
    const supabaseAdmin = createServiceClient()
    const filterBrokerId = isStaff ? undefined : brokerRow?.id
    let q = supabaseAdmin
      .from('switch_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('priority', 'critical')
      .in('status', ['open', 'contacted'])
    if (filterBrokerId) q = q.eq('broker_id', filterBrokerId) as typeof q
    const { count } = await q
    criticalAlerts = count ?? 0
  }

  return <SidebarNav isStaff={isStaff} role={role} name={name} email={email} criticalAlerts={criticalAlerts} tier={tier} />
}
