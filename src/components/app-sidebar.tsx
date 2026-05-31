import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SidebarNav } from './sidebar-nav'

/**
 * AppSidebar — server component that resolves user identity and passes
 * clean, pre-computed props to the client-side SidebarNav.
 *
 * Role partitioning logic (single source of truth):
 *
 *   isOwner:
 *     TRUE  → user has an agencies row with owner_id = uid
 *             (they own the subscription and pay the bill)
 *     FALSE → user is a broker under someone else's agency
 *
 *   isBrokerTier:
 *     TRUE  → the agency subscription_tier is 'broker' | 'solo' | 'starter'
 *             OR the user has no agency row at all
 *             → show stripped 3-item broker nav
 *     FALSE → tier is 'agency' | 'professional' | 'enterprise'
 *             AND isOwner = true
 *             → show full nav + management section
 *
 * The sidebar NEVER shows Team or Agency View to solo brokers or
 * to brokers who are not the agency owner.
 */
export async function AppSidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Parallel fetch: agency (owned by this user) + broker profile
  const [{ data: agency }, { data: brokerRow }] = await Promise.all([
    supabase
      .from('agencies')
      .select('id, subscription_tier')
      .eq('owner_id', user.id)
      .maybeSingle(),
    supabase
      .from('brokers')
      .select('id, role, agency_id, first_name, last_name')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  // ── Identity resolution ───────────────────────────────────────────────────
  const isOwner = agency !== null

  // Agency tier determines feature access, not just the role string.
  // 'professional' is treated as agency tier (used for beta/test accounts).
  const AGENCY_TIERS = ['agency', 'professional', 'enterprise', 'agency_plan']
  const tier         = agency?.subscription_tier ?? 'broker'
  const isBrokerTier = !isOwner || !AGENCY_TIERS.includes(tier)

  // Agency ID for alert count: prefer broker row's agency (where data lives),
  // fall back to owned agency ID.
  const agencyId = brokerRow?.agency_id ?? agency?.id

  const role = brokerRow?.role ?? (isOwner ? 'agency_owner' : 'broker')
  const name = brokerRow
    ? `${brokerRow.first_name ?? ''} ${brokerRow.last_name ?? ''}`.trim()
      || (user.email?.split('@')[0] ?? 'User')
    : (user.email?.split('@')[0] ?? 'User')
  const email = user.email ?? ''

  // ── Critical alert count ──────────────────────────────────────────────────
  let criticalAlerts = 0
  if (agencyId) {
    const svc = createServiceClient()
    // Owners/managers see all agency alerts; solo brokers see only their own.
    let q = svc
      .from('switch_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('priority', 'critical')
      .in('status', ['open', 'contacted'])
    if (isBrokerTier && brokerRow?.id) {
      q = q.eq('broker_id', brokerRow.id) as typeof q
    }
    const { count } = await q
    criticalAlerts = count ?? 0
  }

  return (
    <SidebarNav
      isOwner={isOwner}
      isBrokerTier={isBrokerTier}
      role={role}
      name={name}
      email={email}
      criticalAlerts={criticalAlerts}
    />
  )
}
