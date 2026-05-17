import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CollectionSidebar } from '@/components/collection-sidebar'
import { OnboardingChecklist } from '@/components/onboarding-checklist'
import { AEPCountdown } from '@/components/aep-countdown'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Users, TrendingDown, FileCheck, ShieldCheck,
  DollarSign, AlertTriangle, ArrowUpRight,
} from 'lucide-react'
import type { ElementType } from 'react'

function StatCard({
  label, value, sub, icon: Icon, href, accentCls = '',
}: {
  label: string
  value: string | number
  sub?: string
  icon: ElementType
  href?: string
  accentCls?: string
}) {
  const inner = (
    <Card className={`rounded-3xl border-none p-5 flex flex-col justify-between min-h-[140px] shadow-sm bg-muted/30 transition-colors ${href ? 'hover:bg-muted/50 cursor-pointer' : ''}`}>
      <div className="flex justify-between items-start">
        <span className={`text-[10px] font-black uppercase tracking-widest ${accentCls || 'text-muted-foreground'}`}>{label}</span>
        <Icon className={`w-4 h-4 opacity-50 ${accentCls || 'text-primary'}`} />
      </div>
      <div>
        <div className={`text-3xl font-black mb-1 tracking-tighter ${accentCls || ''}`}>{value}</div>
        {sub && <div className={`text-[9px] font-black uppercase tracking-widest ${accentCls ? accentCls + '/80' : 'text-muted-foreground'}`}>{sub}</div>}
      </div>
    </Card>
  )
  if (href) return <Link href={href} className="block">{inner}</Link>
  return inner
}

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Determine role server-side — 2 queries in parallel
  const [{ data: agency }, { data: brokerRow }] = await Promise.all([
    supabase.from('agencies').select('id, name').eq('owner_id', user.id).maybeSingle(),
    supabase.from('brokers').select('id, role, agency_id').eq('user_id', user.id).maybeSingle(),
  ])

  const isPrincipal = !!agency || ['agency_owner', 'agency_admin'].includes(brokerRow?.role ?? '')
  const isCS        = brokerRow?.role === 'customer_service'
  const isStaff     = isPrincipal || isCS
  const agencyId    = agency?.id ?? brokerRow?.agency_id
  if (!agencyId) redirect('/login')

  // Fetch agency name for staff title (if admin/CS, look up by agency_id)
  let agencyName = agency?.name ?? null
  if (!agencyName && isStaff && brokerRow?.agency_id) {
    const { data: agData } = await supabase.from('agencies').select('name').eq('id', brokerRow.agency_id).maybeSingle()
    agencyName = agData?.name ?? null
  }

  // ── Owner / CS stats ──────────────────────────────────────────────────────
  type OwnerStats = { totalClients: number; openAlerts: number; vccPending: number; protectionRate: number; revenueAtRisk: number }
  type BrokerStats = { myClients: number; myOpenAlerts: number; myVccPending: number; mySaveRate: number }

  let ownerStats: OwnerStats | null = null
  let brokerStats: BrokerStats | null = null

  if (isStaff) {
    const [
      { count: totalClients },
      { count: openAlerts },
      { count: vccPending },
      { count: totalLocked },
      { count: criticalAlerts },
    ] = await Promise.all([
      supabase.from('ghl_contacts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
      supabase.from('switch_alerts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).in('status', ['open', 'contacted']),
      supabase.from('vcc_submissions').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).not('fax_status', 'in', '("signed","expired")'),
      supabase.from('ghl_contacts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('aor_status', 'locked'),
      supabase.from('switch_alerts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('priority', 'critical').in('status', ['open', 'contacted']),
    ])
    const total = totalClients ?? 0
    ownerStats = {
      totalClients: total,
      openAlerts: openAlerts ?? 0,
      vccPending: vccPending ?? 0,
      protectionRate: total > 0 ? Math.round(((totalLocked ?? 0) / total) * 100) : 0,
      revenueAtRisk: (criticalAlerts ?? 0) * 600,
    }
  } else {
    // Broker — stats scoped to this user's clients only
    const brokerId = brokerRow?.id ?? ''
    const [
      { count: myClients },
      { count: myAlerts },
      { count: myVcc },
      { count: resolvedAlerts },
      { count: totalAlerts },
    ] = await Promise.all([
      supabase.from('ghl_contacts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('assigned_broker_id', user.id),
      supabase.from('switch_alerts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('broker_id', brokerId).in('status', ['open', 'contacted']),
      supabase.from('vcc_submissions').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('broker_id', brokerId).not('fax_status', 'in', '("signed","expired")'),
      supabase.from('switch_alerts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('broker_id', brokerId).eq('status', 'resolved'),
      supabase.from('switch_alerts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('broker_id', brokerId),
    ])
    const total = totalAlerts ?? 0
    brokerStats = {
      myClients: myClients ?? 0,
      myOpenAlerts: myAlerts ?? 0,
      myVccPending: myVcc ?? 0,
      mySaveRate: total > 0 ? Math.round(((resolvedAlerts ?? 0) / total) * 100) : 100,
    }
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <CollectionSidebar />
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 p-4 md:p-8 space-y-8 pb-24">

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl md:text-3xl font-black tracking-tight text-foreground uppercase">
                {isStaff ? (agencyName ? `${agencyName} Dashboard` : 'Agency Dashboard') : 'My Dashboard'}
              </h1>
              <p className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                {isStaff ? 'Agency-wide overview' : 'Your book of business'}
              </p>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 h-8 gap-2 font-black uppercase tracking-widest text-[9px]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </Badge>
          </div>

          {/* Stat Cards */}
          {isStaff && ownerStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard label="Total Agency Clients" value={ownerStats.totalClients} sub="All contacts" icon={Users} href="/dashboard/retention" />
              <StatCard label="Open Switch Alerts" value={ownerStats.openAlerts} sub="Require action" icon={TrendingDown} href="/dashboard/churn" accentCls={ownerStats.openAlerts > 0 ? 'text-red-500' : ''} />
              <StatCard label="VCC Pending" value={ownerStats.vccPending} sub="Awaiting dispatch" icon={FileCheck} href="/dashboard/vcc" accentCls={ownerStats.vccPending > 0 ? 'text-amber-500' : ''} />
              <StatCard label="Protection Rate" value={`${ownerStats.protectionRate}%`} sub="Aegis Locked" icon={ShieldCheck} accentCls={ownerStats.protectionRate >= 50 ? 'text-emerald-500' : 'text-amber-500'} />
              <StatCard label="Revenue at Risk" value={`$${ownerStats.revenueAtRisk.toLocaleString()}`} sub="@$600 × critical alerts" icon={DollarSign} href="/dashboard/churn" accentCls={ownerStats.revenueAtRisk > 0 ? 'text-red-500' : 'text-emerald-500'} />
            </div>
          ) : brokerStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="My Clients" value={brokerStats.myClients} sub="Assigned to you" icon={Users} href="/dashboard/retention" />
              <StatCard label="My Open Alerts" value={brokerStats.myOpenAlerts} sub="Action required" icon={AlertTriangle} href="/dashboard/churn" accentCls={brokerStats.myOpenAlerts > 0 ? 'text-red-500' : ''} />
              <StatCard label="My VCC Pending" value={brokerStats.myVccPending} sub="Awaiting dispatch" icon={FileCheck} href="/dashboard/vcc" accentCls={brokerStats.myVccPending > 0 ? 'text-amber-500' : ''} />
              <StatCard label="My Save Rate" value={`${brokerStats.mySaveRate}%`} sub="Alerts resolved" icon={ShieldCheck} accentCls={brokerStats.mySaveRate >= 70 ? 'text-emerald-500' : 'text-amber-500'} />
            </div>
          ) : null}

          {/* AEP Countdown */}
          <AEPCountdown />

          {/* Onboarding */}
          <OnboardingChecklist />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/dashboard/retention" className="group">
              <div className="flex items-center gap-4 p-5 rounded-3xl border border-border hover:border-primary/30 bg-muted/20 hover:bg-muted/30 transition-all">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Users className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest">My Book</p>
                  <p className="text-[10px] text-muted-foreground font-medium">View all contacts</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
            <Link href="/dashboard/churn/upload" className="group">
              <div className="flex items-center gap-4 p-5 rounded-3xl border border-border hover:border-primary/30 bg-muted/20 hover:bg-muted/30 transition-all">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600"><TrendingDown className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest">Upload Roster</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Detect plan switches</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
            <Link href="/dashboard/vcc/new" className="group">
              <div className="flex items-center gap-4 p-5 rounded-3xl border border-border hover:border-primary/30 bg-muted/20 hover:bg-muted/30 transition-all">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600"><FileCheck className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest">New VCC Form</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Start a carrier form</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
