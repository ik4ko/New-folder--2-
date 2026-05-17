import { createClient } from '@/lib/supabase/server'
import { SidebarNav } from './sidebar-nav'

export async function AppSidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: agency }, { data: brokerRow }] = await Promise.all([
    supabase.from('agencies').select('id').eq('owner_id', user.id).maybeSingle(),
    supabase.from('brokers').select('id, role, first_name, last_name').eq('user_id', user.id).maybeSingle(),
  ])

  const isPrincipal = !!agency || ['agency_owner', 'agency_admin'].includes(brokerRow?.role ?? '')
  const isCS = brokerRow?.role === 'customer_service'
  const isStaff = isPrincipal || isCS
  const role = brokerRow?.role ?? 'broker'
  const name = brokerRow
    ? `${brokerRow.first_name ?? ''} ${brokerRow.last_name ?? ''}`.trim() || (user.email?.split('@')[0] ?? 'User')
    : (user.email?.split('@')[0] ?? 'User')
  const email = user.email ?? ''

  return <SidebarNav isStaff={isStaff} role={role} name={name} email={email} />
}
