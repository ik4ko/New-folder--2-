'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard, ExternalLink, CheckCircle2, AlertTriangle,
  XCircle, RefreshCw, ArrowUpRight, Clock, Building2, Lock, Users, User, Shield,
} from 'lucide-react'
import Link from 'next/link'

type BillingCase = 'owner' | 'staff_non_owner' | 'agency_broker' | 'solo_broker' | null

interface AgencyData {
  id?: string
  name?: string | null
  subscription_status?: string | null
  subscription_tier?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  current_period_end?: string | null
  is_beta?: boolean | null
}

const STATUS_CFG: Record<string, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  active:    { label: 'Active',    icon: CheckCircle2,  cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  beta:      { label: 'Beta',      icon: CheckCircle2,  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  past_due:  { label: 'Past Due',  icon: AlertTriangle, cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  cancelled: { label: 'Cancelled', icon: XCircle,       cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  trial:     { label: 'Trial',     icon: Clock,         cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
}

function fmtDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function planLabel(tier: string | null | undefined) {
  if (!tier) return 'Trial'
  if (['agency', 'professional', 'enterprise'].includes(tier)) return 'Agency Plan'
  if (['broker', 'solo', 'starter'].includes(tier)) return 'Broker Plan'
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}

function PageHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="h-16 border-b border-border px-8 flex items-center gap-3 bg-card/50 backdrop-blur-md sticky top-0 z-10">
      <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
        <CreditCard className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h1 className="text-lg font-black text-foreground uppercase tracking-tight">Plan &amp; Billing</h1>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{subtitle}</p>
      </div>
    </header>
  )
}

export default function BillingPage() {
  const [billingCase, setBillingCase] = useState<BillingCase>(null)
  const [agency, setAgency] = useState<AgencyData | null>(null)
  const [agencyName, setAgencyName] = useState<string | null>(null)
  const [brokerRole, setBrokerRole] = useState<string | null>(null)
  const [brokerCount, setBrokerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [portalPending, startPortal] = useTransition()
  const [upgradePending, startUpgrade] = useTransition()
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const [{ data: ag }, { data: brokerRow }] = await Promise.all([
        supabase.from('agencies')
          .select('id, name, subscription_status, subscription_tier, stripe_customer_id, stripe_subscription_id, current_period_end, is_beta')
          .eq('owner_id', user.id)
          .maybeSingle(),
        supabase.from('brokers')
          .select('id, role, agency_id')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      const role = brokerRow?.role ?? null
      setBrokerRole(role)

      if (role === 'solo_broker') {
        setBillingCase('solo_broker')
        if (ag) setAgency(ag)
      } else if (ag) {
        setBillingCase('owner')
        setAgency(ag)
        const { count } = await supabase
          .from('brokers')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', ag.id)
        setBrokerCount(count ?? 0)
      } else if (role === 'agency_admin' || role === 'customer_service') {
        setBillingCase('staff_non_owner')
        if (brokerRow?.agency_id) {
          const { data: agData } = await supabase
            .from('agencies')
            .select('name, subscription_tier, subscription_status, is_beta')
            .eq('id', brokerRow.agency_id)
            .maybeSingle()
          setAgencyName(agData?.name ?? null)
          if (agData) setAgency(agData)
        }
      } else {
        setBillingCase('agency_broker')
        if (brokerRow?.agency_id) {
          const { data: agData } = await supabase
            .from('agencies')
            .select('name, subscription_tier, subscription_status, is_beta')
            .eq('id', brokerRow.agency_id)
            .maybeSingle()
          setAgencyName(agData?.name ?? null)
          if (agData) setAgency(agData)
        }
      }

      setLoading(false)
    })
  }, [])

  const handlePortal = () => {
    startPortal(async () => {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error ?? 'Could not open billing portal')
    })
  }

  const handleUpgrade = (plan: string) => {
    setUpgradingPlan(plan)
    startUpgrade(async () => {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else { alert(data.error ?? 'Could not start checkout'); setUpgradingPlan(null) }
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full">
        <PageHeader subtitle="Loading..." />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const isBeta = agency?.is_beta ?? false
  const status = agency?.subscription_status ?? 'trial'
  const statusKey = isBeta ? 'beta' : status
  const statusCfg = STATUS_CFG[statusKey] ?? STATUS_CFG.trial
  const StatusIcon = statusCfg.icon
  const hasSubscription = !!agency?.stripe_subscription_id

  // ── CASE 1: Agency Owner ─────────────────────────────────────────────────
  if (billingCase === 'owner') {
    const extraBrokers = Math.max(0, brokerCount - 5)
    const extraCost = extraBrokers * 30
    const totalCost = 497 + extraCost

    return (
      <div className="flex flex-col h-full w-full">
        <PageHeader subtitle="Agency subscription & seats" />
        <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full space-y-6 pb-32">

          <Card className="rounded-3xl border border-border shadow-sm">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <Badge className={`font-black uppercase text-[9px] px-3 h-6 border flex items-center gap-1.5 w-fit ${statusCfg.cls}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusCfg.label}
                  </Badge>
                  <p className="text-2xl font-black uppercase tracking-tight">Agency Plan</p>
                  <p className="text-3xl font-black">
                    ${totalCost.toLocaleString()}<span className="text-sm text-muted-foreground font-bold">/mo</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
              </div>

              {isBeta && (
                <div className="rounded-2xl bg-blue-500/5 border border-blue-500/15 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Complimentary Beta Access</p>
                  <p className="text-[11px] text-muted-foreground">No charges during beta. You'll be notified before billing begins.</p>
                </div>
              )}

              {!isBeta && agency?.current_period_end && (
                <p className="text-[11px] font-bold text-muted-foreground">
                  {status === 'active' ? 'Renews' : 'Expires'} {fmtDate(agency.current_period_end)}
                </p>
              )}

              <div className="rounded-2xl bg-muted/40 border border-border px-5 py-4 space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground font-bold">Base plan (5 broker seats)</span>
                  <span className="font-black">$497/mo</span>
                </div>
                {extraBrokers > 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground font-bold">+ {extraBrokers} additional broker{extraBrokers !== 1 ? 's' : ''} × $30/mo</span>
                    <span className="text-amber-400 font-black">+${extraCost}/mo</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between items-center">
                  <span className="text-[12px] font-black uppercase tracking-widest">Total</span>
                  <span className="text-[12px] font-black">${totalCost.toLocaleString()}/mo</span>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                {hasSubscription && (
                  <Button
                    onClick={handlePortal}
                    disabled={portalPending}
                    variant="outline"
                    className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest h-10 gap-2"
                  >
                    {portalPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    Manage Billing
                  </Button>
                )}
                {!hasSubscription && !isBeta && (
                  <Button
                    onClick={() => handleUpgrade('agency')}
                    disabled={upgradePending}
                    className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest h-10 gap-2"
                  >
                    {upgradePending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    Upgrade to Paid
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="rounded-2xl bg-muted/20 border border-border px-5 py-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest">
                {brokerCount} broker{brokerCount !== 1 ? 's' : ''} on your agency
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Base plan includes 5 seats. Additional brokers are $30/mo each.</p>
            </div>
            <Button asChild variant="outline" size="sm"
              className="rounded-xl font-black uppercase text-[9px] tracking-widest h-8 px-3">
              <Link href="/dashboard/team">Manage</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── CASE 4: Solo Broker ──────────────────────────────────────────────────
  if (billingCase === 'solo_broker') {
    return (
      <div className="flex flex-col h-full w-full">
        <PageHeader subtitle="Your broker plan" />
        <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full space-y-6 pb-32">

          <Card className="rounded-3xl border border-border shadow-sm">
            <CardContent className="p-8 space-y-5">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <Badge className={`font-black uppercase text-[9px] px-3 h-6 border flex items-center gap-1.5 w-fit ${statusCfg.cls}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusCfg.label}
                  </Badge>
                  <p className="text-2xl font-black uppercase tracking-tight">Broker Plan</p>
                  <p className="text-3xl font-black">$79<span className="text-sm text-muted-foreground font-bold">/mo</span></p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
              </div>

              {isBeta && (
                <div className="rounded-2xl bg-blue-500/5 border border-blue-500/15 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Complimentary Beta Access</p>
                  <p className="text-[11px] text-muted-foreground">No charge until you upgrade. You'll be notified before billing begins.</p>
                </div>
              )}

              {!isBeta && status === 'trial' && (
                <div className="rounded-2xl bg-amber-500/5 border border-amber-500/15 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Free Trial Active</p>
                  {agency?.current_period_end && (
                    <p className="text-[11px] text-muted-foreground">Trial expires {fmtDate(agency.current_period_end)}</p>
                  )}
                </div>
              )}

              {!isBeta && status === 'active' && agency?.current_period_end && (
                <p className="text-[11px] font-bold text-muted-foreground">Next billing: {fmtDate(agency.current_period_end)}</p>
              )}

              <div className="flex gap-3 pt-1">
                {hasSubscription && (
                  <Button onClick={handlePortal} disabled={portalPending} variant="outline"
                    className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest h-10 gap-2">
                    {portalPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    Manage Billing
                  </Button>
                )}
                {!hasSubscription && !isBeta && (
                  <Button onClick={() => handleUpgrade('broker')} disabled={upgradePending}
                    className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest h-10 gap-2">
                    {upgradePending && upgradingPlan === 'broker' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    Upgrade to Paid
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="p-7 space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight mb-2">Need a Team? Upgrade to Agency</p>
                <ul className="space-y-1.5">
                  {['Multi-broker management & oversight', 'Agency-wide churn monitor', 'Revenue-at-risk dashboard'].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 gap-2 w-fit">
                <Link href="/signup?plan=agency">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Start Agency Trial
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── CASE 2: Staff Non-Owner ───────────────────────────────────────────────
  if (billingCase === 'staff_non_owner') {
    const roleLabel = brokerRole === 'customer_service' ? 'Customer Service' : 'Manager'
    return (
      <div className="flex flex-col h-full w-full">
        <PageHeader subtitle="Plan information" />
        <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full space-y-6 pb-32">
          <Card className="rounded-3xl border border-border shadow-sm">
            <CardContent className="p-8 space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black uppercase tracking-tight">Your Plan</p>
                <p className="text-sm font-bold text-muted-foreground">
                  You are a <span className="text-primary">{roleLabel}</span>
                  {agencyName ? <> under <span className="font-black">{agencyName}</span></> : ' on this agency'}.
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Subscription is managed by your agency owner. Contact them to make billing changes.
                </p>
              </div>
              {agency && (
                <div className="rounded-2xl bg-muted/40 border border-border px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Agency Plan</p>
                    <p className="text-sm font-black">{planLabel(agency.subscription_tier)}</p>
                  </div>
                  <Badge className={`font-black uppercase text-[9px] px-3 h-6 border ${statusCfg.cls}`}>
                    {statusCfg.label}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── CASE 3: Broker under agency (default) ────────────────────────────────
  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader subtitle="Your access" />
      <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full space-y-6 pb-32">

        <Card className="rounded-3xl border border-border shadow-sm">
          <CardContent className="p-8 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-black uppercase tracking-tight">Your Access</p>
              <p className="text-sm font-bold text-muted-foreground">
                You are a <span className="text-primary">Broker</span>
                {agencyName ? <> under <span className="font-black">{agencyName}</span></> : ' on this agency'}.
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your access is included in your agency&apos;s plan. Contact your agency owner to make billing changes.
              </p>
            </div>
            {agency && (
              <div className="rounded-2xl bg-muted/40 border border-border px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Agency Plan</p>
                  <p className="text-sm font-black">{planLabel(agency.subscription_tier)}</p>
                </div>
                <Badge className={`font-black uppercase text-[9px] px-3 h-6 border ${statusCfg.cls}`}>
                  {statusCfg.label}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-7 space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-tight mb-1">Want Your Own Agency?</p>
              <p className="text-[11px] text-muted-foreground mt-1">Manage your own team of brokers with full agency oversight and reporting.</p>
            </div>
            <Button asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 gap-2 w-fit">
              <Link href="/signup?plan=agency">
                <ArrowUpRight className="w-3.5 h-3.5" /> Start Agency Trial
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
