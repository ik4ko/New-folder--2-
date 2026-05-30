import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { autoProvisionUser } from '@/app/actions/auto-provision'
import { OnboardingChecklist } from '@/components/onboarding-checklist'
import { RevenueLeakageCalculator } from '@/components/revenue-leakage-calculator'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Users, TrendingDown, FileCheck, ShieldCheck,
  AlertTriangle, ArrowUpRight, XCircle,
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

  const [{ data: agency }, { data: brokerRow }] = await Promise.all([
    supabase.from('agencies').select('id, name, subscription_tier').eq('owner_id', user.id).maybeSingle(),
    supabase.from('brokers').select('id, role, agency_id').eq('user_id', user.id).maybeSingle(),
  ])

  const isPrincipal = ['agency_owner', 'agency_admin'].includes(brokerRow?.role ?? '')
  const isCS        = brokerRow?.role === 'customer_service'
  const isStaff     = isPrincipal || isCS || !!agency

  // ── Agency ID resolution ─────────────────────────────────────────────────
  // Priority: brokerRow.agency_id > agency.id
  //
  // Rationale: A user may OWN one agency (owner_id match) while their broker
  // row — and all their actual data (BOB, alerts, VCC) — lives in a different
  // agency (e.g. after a tenant-isolation repair that moved the owned agency
  // but left data in the old shared one). Using brokerRow.agency_id ensures
  // stats queries target the agency that actually holds their records.
  //
  // If there is no broker row at all (pure owner with no broker profile yet),
  // fall back to agency.id — autoProvision will create the broker row.
  const agencyId = brokerRow?.agency_id ?? agency?.id

  // 'broker' tier = Solo $149 plan — never show agency-wide counters or revenue leakage
  const agencyTier      = agency?.subscription_tier ?? 'broker'
  const showAgencyView  = isStaff && agencyTier !== 'broker'

  if (!agencyId) {
    try {
      await autoProvisionUser({ userId: user.id, email: user.email ?? '' })
    } catch (e) {
      console.error('[dashboard] auto-provision failed:', e)
      return (
        <div className="flex h-full w-full bg-background overflow-hidden">
          <div className="flex-1 flex flex-col p-8">
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 max-w-lg mt-8">
              <p className="text-sm font-black text-amber-300 uppercase tracking-widest">Account Setup In Progress</p>
              <p className="text-xs text-amber-200/70 mt-2 leading-relaxed font-medium">
                Your workspace is still being provisioned. Please refresh the page in a moment.
                If this persists, contact support at hello@aegissage.com
              </p>
            </div>
          </div>
        </div>
      )
    }
    redirect('/dashboard')
  }

  let agencyName = agency?.name ?? null
  if (!agencyName && isStaff && brokerRow?.agency_id) {
    const { data: agData } = await supabase.from('agencies').select('name').eq('id', brokerRow.agency_id).maybeSingle()
    agencyName = agData?.name ?? null
  }

  // Use service client for all stat counts — bypasses RLS, safe because agencyId is always applied
  const supabaseAdmin = createServiceClient()

  type OwnerStats = {
    totalClients: number
    openAlerts: number
    vccPending: number
    criticalAlerts: number
    revenueAtRisk: number
    switchingAlerts: number
    termedAlerts: number
    marxVerified: number
  }
  type BrokerStats = { myClients: number; myOpenAlerts: number; myVccPending: number; mySaveRate: number }

  let ownerStats: OwnerStats | null = null
  let brokerStats: BrokerStats | null = null

  if (showAgencyView) {
    const [
      { count: totalClients },
      { count: openAlerts },
      { count: vccPending },
      { count: criticalAlerts },
      { count: switchingAlerts },
      { count: termedAlerts },
      { count: marxVerified },
    ] = await Promise.all([
      supabaseAdmin.from('book_of_business').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
      supabaseAdmin.from('switch_alerts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).in('status', ['open', 'contacted']),
      supabaseAdmin.from('vcc_submissions').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).not('fax_status', 'in', '("signed","expired")'),
      supabaseAdmin.from('switch_alerts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('priority', 'critical').in('status', ['open', 'contacted']),
      supabaseAdmin.from('switch_alerts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('switch_type', 'future_plan_change').in('status', ['open', 'contacted']),
      supabaseAdmin.from('switch_alerts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).in('switch_type', ['termed', 'fully_disenrolled', 'plan_changed']).in('status', ['open', 'contacted']),
      supabaseAdmin.from('book_of_business').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('enrollment_status', 'active').not('last_marx_check', 'is', null),
    ])
    const total = totalClients ?? 0
    ownerStats = {
      totalClients: total,
      openAlerts:      openAlerts ?? 0,
      vccPending:      vccPending ?? 0,
      criticalAlerts:  criticalAlerts ?? 0,
      revenueAtRisk:   (criticalAlerts ?? 0) * 600,
      switchingAlerts: switchingAlerts ?? 0,
      termedAlerts:    termedAlerts ?? 0,
      marxVerified:    marxVerified ?? 0,
    }
  } else {
    const brokerId = brokerRow?.id ?? ''
    const [
      { count: myClients },
      { count: myAlerts },
      { count: myVcc },
      { count: resolvedAlerts },
      { count: totalAlerts },
    ] = await Promise.all([
      supabaseAdmin.from('book_of_business').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('broker_id', brokerId),
      supabaseAdmin.from('switch_alerts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('broker_id', brokerId).in('status', ['open', 'contacted']),
      supabaseAdmin.from('vcc_submissions').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('broker_id', brokerId).not('fax_status', 'in', '("signed","expired")'),
      supabaseAdmin.from('switch_alerts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('broker_id', brokerId).eq('status', 'resolved'),
      supabaseAdmin.from('switch_alerts').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).eq('broker_id', brokerId),
    ])
    const total = totalAlerts ?? 0
    brokerStats = {
      myClients:    myClients ?? 0,
      myOpenAlerts: myAlerts ?? 0,
      myVccPending: myVcc ?? 0,
      mySaveRate:   total > 0 ? Math.round(((resolvedAlerts ?? 0) / total) * 100) : 100,
    }
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="flex-1 p-4 md:p-8 space-y-8 pb-24">

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl md:text-3xl font-black tracking-tight text-foreground uppercase">
                {agencyName ? agencyName.toUpperCase() : (isStaff ? 'DASHBOARD' : 'MY DASHBOARD')}
              </h1>
              <p className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">
                {agencyName ? `${agencyName} · Agency Overview` : (isStaff ? 'Agency Overview' : 'Your Book of Business')}
              </p>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 h-8 gap-2 font-black uppercase tracking-widest text-[9px]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </Badge>
          </div>

          {/* Stat Cards */}
          {showAgencyView && ownerStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Agency Clients" value={ownerStats.totalClients} sub="Book of business" icon={Users} href="/dashboard/book" />
              <StatCard label="Open Switch Alerts" value={ownerStats.openAlerts} sub="Require action" icon={TrendingDown} href="/dashboard/churn" accentCls={ownerStats.openAlerts > 0 ? 'text-red-500' : ''} />
              <StatCard label="Critical Alerts" value={ownerStats.criticalAlerts} sub="Missing from roster" icon={AlertTriangle} href="/dashboard/alerts" accentCls={ownerStats.criticalAlerts > 0 ? 'text-red-500' : ''} />
              <StatCard label="VCC Pending" value={ownerStats.vccPending} sub="Awaiting dispatch" icon={FileCheck} href="/dashboard/vcc" accentCls={ownerStats.vccPending > 0 ? 'text-amber-500' : ''} />
            </div>
          ) : brokerStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="My Clients" value={brokerStats.myClients} sub="Assigned to you" icon={Users} href="/dashboard/book" />
              <StatCard label="My Open Alerts" value={brokerStats.myOpenAlerts} sub="Action required" icon={AlertTriangle} href="/dashboard/churn" accentCls={brokerStats.myOpenAlerts > 0 ? 'text-red-500' : ''} />
              <StatCard label="My VCC Pending" value={brokerStats.myVccPending} sub="Awaiting dispatch" icon={FileCheck} href="/dashboard/vcc" accentCls={brokerStats.myVccPending > 0 ? 'text-amber-500' : ''} />
              <StatCard label="My Save Rate" value={`${brokerStats.mySaveRate}%`} sub="Alerts resolved" icon={ShieldCheck} accentCls={brokerStats.mySaveRate >= 70 ? 'text-emerald-500' : 'text-amber-500'} />
            </div>
          ) : null}

          {/* Revenue Leakage Calculator — Agency Plan only, never Solo Broker */}
          {showAgencyView && ownerStats && (ownerStats.switchingAlerts > 0 || ownerStats.termedAlerts > 0) && (
            <RevenueLeakageCalculator
              switchingCount={ownerStats.switchingAlerts}
              termedCount={ownerStats.termedAlerts}
              totalCount={ownerStats.totalClients}
              perMemberValue={600}
            />
          )}

          {/* Alert Summary Widget — agency view only */}
          {showAgencyView && ownerStats ? (
            <Link href="/dashboard/alerts" className="block">
              <div className={`rounded-3xl border p-5 transition-colors ${
                ownerStats.openAlerts > 0
                  ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
                  : 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
              }`}>
                {ownerStats.openAlerts > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-widest text-red-400">
                        {ownerStats.openAlerts} open alert{ownerStats.openAlerts !== 1 ? 's' : ''} · click to review
                      </p>
                      <ArrowUpRight className="w-4 h-4 text-red-400/60 shrink-0" />
                    </div>
                    {ownerStats.switchingAlerts > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <p className="text-[11px] font-black text-orange-400 uppercase tracking-widest">
                          {ownerStats.switchingAlerts} client{ownerStats.switchingAlerts !== 1 ? 's' : ''} switching at AEP — act now
                        </p>
                      </div>
                    )}
                    {ownerStats.termedAlerts > 0 && (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <p className="text-[11px] font-black text-red-400 uppercase tracking-widest">
                          {ownerStats.termedAlerts} client{ownerStats.termedAlerts !== 1 ? 's' : ''} have already left
                        </p>
                      </div>
                    )}
                    {ownerStats.revenueAtRisk > 0 && (
                      <p className="text-[10px] text-red-400/60 font-medium">
                        ${ownerStats.revenueAtRisk.toLocaleString()} estimated revenue at risk
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">
                        {ownerStats.marxVerified > 0
                          ? `All ${ownerStats.marxVerified} verified client${ownerStats.marxVerified !== 1 ? 's' : ''} — no changes`
                          : 'All clear'}
                      </p>
                      <p className="text-[10px] text-emerald-400/60 font-medium mt-0.5">No open switch alerts</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-emerald-400/60 shrink-0" />
                  </div>
                )}
              </div>
            </Link>
          ) : null}

          {/* Onboarding */}
          <OnboardingChecklist />

          {/* MARx Monitoring Status — agency view only */}
          {showAgencyView && ownerStats && (
            <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/20">
              <div>
                <p className="text-sm font-medium text-foreground">MARx Monitoring</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ownerStats.marxVerified} of {ownerStats.totalClients} members verified
                </p>
              </div>
              <Link href="/dashboard/book" className="text-xs text-primary hover:text-primary/80 font-medium">
                Run verification →
              </Link>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/dashboard/book" className="group">
              <div className="flex items-center gap-4 p-5 rounded-3xl border border-border hover:border-primary/30 bg-muted/20 hover:bg-muted/30 transition-all">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Users className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest">My Book</p>
                  <p className="text-[10px] text-muted-foreground font-medium">View all members</p>
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
            <Link href="/dashboard/alerts" className="group">
              <div className="flex items-center gap-4 p-5 rounded-3xl border border-border hover:border-primary/30 bg-muted/20 hover:bg-muted/30 transition-all">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500"><AlertTriangle className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest">View Alerts</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Plan switches &amp; AOR changes</p>
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
