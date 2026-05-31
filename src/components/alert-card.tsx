'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  AlertTriangle, Bell, CheckCircle2, Clock,
  PhoneCall, XCircle, ArrowRight, Flag, ArrowLeftRight,
  Sparkles, ShieldCheck, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Shared type (also consumed by alerts-feed.tsx and alerts page) ────────────

export type AlertRow = {
  id: string
  broker_id: string | null
  bob_member_id: string | null
  carrier: string | null
  alert_type: string | null
  previous_value: string | null
  new_value: string | null
  priority: string | null
  status: string | null
  detection_source: string | null
  detected_at: string | null
  created_at: string | null
  confidence_score?: number | null
  confidence_status?: string | null
  member_full_name: string | null
  member_plan: string | null
  carrier_display: string | null
  broker_full_name?: string | null
  switch_type?: string | null
  previous_plan_code?: string | null
  new_plan_code?: string | null
  new_plan_name?: string | null
  effective_date?: string | null
  end_date?: string | null
  // Revenue / carrier columns (migration 20260529100000 + 20260530000000)
  previous_carrier?: string | null
  new_carrier?: string | null
  estimated_revenue_at_risk?: number | null
}

export type AlertStatus = 'contacted' | 'resolved' | 'mitigating'

interface Props {
  alert: AlertRow
  isStaff?: boolean
  onStatusChange?: (alertId: string, status: AlertStatus) => void
  onFalseAlarm?: (alertId: string) => void
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

function timeAgo(d: string | null | undefined): string {
  if (!d) return ''
  const ms   = Date.now() - new Date(d).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function timeAgoVerbose(d: string | null | undefined): string {
  if (!d) return ''
  const ms   = Date.now() - new Date(d).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 60)  return `Detected ${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `Detected ${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `Detected ${days} day${days !== 1 ? 's' : ''} ago`
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '--'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
  })
}

function fmtFull(d: string | null | undefined): string {
  if (!d) return '--'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: '2-digit',
    hour: 'numeric', minute: '2-digit',
  })
}

/** Extract the human-readable carrier name from a pipe-delimited value string. */
function parseCarrierFromValue(val: string | null | undefined): string | null {
  if (!val) return null
  return val.includes('|') ? val.split('|')[0].trim() : val.trim()
}

function parsePlanFromValue(val: string | null | undefined): string | null {
  if (!val || !val.includes('|')) return null
  return val.split('|').slice(1).join('|').trim()
}

// ── Switch-type-specific alert body ──────────────────────────────────────────

function AlertBody({ alert }: { alert: AlertRow }) {
  const st = alert.switch_type

  const planDisplay = (alert.member_plan && alert.member_plan !== 'unknown' && alert.member_plan !== 'Unknown Plan')
    ? alert.member_plan
    : (alert.carrier_display ?? alert.carrier) || 'Unknown Plan'

  // ── Carrier switch (cross-carrier, from Ghost Churn Monitor cron) ───────────
  if (st === 'carrier_switch') {
    const fromCarrier = alert.previous_carrier
      ?? alert.carrier_display
      ?? parseCarrierFromValue(alert.previous_value)
      ?? 'Previous Carrier'
    const toCarrier   = alert.new_carrier
      ?? parseCarrierFromValue(alert.new_value)
      ?? alert.carrier
      ?? 'New Carrier'
    const fromPlan = alert.member_plan ?? parsePlanFromValue(alert.previous_value)
    const toPlan   = alert.new_plan_name ?? parsePlanFromValue(alert.new_value)

    return (
      <div className="space-y-3">
        {/* Arrow indicator */}
        <div className="flex items-center gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">From</p>
            <p className="text-xs font-bold text-slate-400 truncate">{fromCarrier}</p>
            {fromPlan && (
              <p className="text-[10px] text-slate-600 truncate">{fromPlan}</p>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-red-500 shrink-0" />
          <div className="space-y-0.5 min-w-0">
            <p className="text-[8px] font-black uppercase tracking-widest text-red-400">Switched To</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
              <p className="text-xs font-black text-white truncate">{toCarrier}</p>
            </div>
            {toPlan && (
              <p className="text-[10px] text-slate-400 truncate">{toPlan}</p>
            )}
          </div>
        </div>
        <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">
          Ghost Churn Monitor · Cross-carrier detection
        </p>
      </div>
    )
  }

  // ── Plan switch (same carrier, from Ghost Churn Monitor cron) ───────────────
  if (st === 'plan_switch') {
    const carrier  = alert.previous_carrier ?? alert.carrier_display ?? alert.carrier ?? 'Carrier'
    const fromPlan = alert.member_plan ?? parsePlanFromValue(alert.previous_value) ?? alert.previous_value ?? 'Previous Plan'
    const toPlan   = alert.new_plan_name ?? parsePlanFromValue(alert.new_value) ?? alert.new_value ?? 'New Plan'

    return (
      <div className="space-y-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{carrier}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-400 font-medium truncate max-w-[40%]">{fromPlan}</p>
          <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <p className="text-xs font-black text-amber-300 truncate">{toPlan}</p>
          </div>
        </div>
        <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold">
          Ghost Churn Monitor · Plan switch detected
        </p>
      </div>
    )
  }

  // ── MARx: termed ──────────────────────────────────────────────────────────
  if (st === 'termed') {
    return (
      <div className="space-y-1 text-xs">
        <p className="text-slate-300">
          <span className="text-slate-500">Left: </span>
          {planDisplay}
          {alert.previous_plan_code && ` (${alert.previous_plan_code})`}
        </p>
        {alert.end_date && (
          <p className="text-slate-400">
            <span className="text-slate-500">Plan ended: </span>
            {fmtDate(alert.end_date)}
          </p>
        )}
        <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold pt-0.5">
          Source: CMS MARx (verified)
        </p>
      </div>
    )
  }

  // ── MARx: future plan change ───────────────────────────────────────────────
  if (st === 'future_plan_change') {
    return (
      <div className="space-y-1 text-xs">
        <p className="text-slate-300">
          <span className="text-slate-500">Currently: </span>
          {planDisplay}
          {alert.previous_plan_code && ` (${alert.previous_plan_code})`}
        </p>
        <p className="text-orange-300 font-medium">
          <span className="text-slate-500">Switching to: </span>
          {alert.new_plan_name ?? alert.new_plan_code ?? 'Unknown plan'}
          {alert.new_plan_code && ` (${alert.new_plan_code})`}
        </p>
        {alert.effective_date && (
          <p className="text-slate-400">
            <span className="text-slate-500">Effective: </span>
            {fmtDate(alert.effective_date)}
          </p>
        )}
        <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold pt-0.5">
          Source: CMS MARx (AEP enrollment detected)
        </p>
      </div>
    )
  }

  // ── MARx: plan changed ──────────────────────────────────────────────────────
  if (st === 'plan_changed') {
    return (
      <div className="space-y-1 text-xs">
        <p className="text-slate-400">
          <span className="text-slate-500">Was on: </span>
          {planDisplay}
          {alert.previous_plan_code && ` (${alert.previous_plan_code})`}
        </p>
        <p className="text-red-300 font-medium">
          <span className="text-slate-500">Now on: </span>
          {alert.new_plan_name ?? alert.new_plan_code ?? 'Unknown plan'}
          {alert.new_plan_code && ` (${alert.new_plan_code})`}
        </p>
        <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold pt-0.5">
          Detected via: CMS MARx
        </p>
      </div>
    )
  }

  // ── MARx: fully disenrolled ─────────────────────────────────────────────────
  if (st === 'fully_disenrolled') {
    return (
      <div className="space-y-1 text-xs">
        <p className="text-red-400 font-medium">No active Medicare plan found in MARx</p>
        <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold pt-0.5">
          Source: CMS MARx (verified)
        </p>
      </div>
    )
  }

  // ── Fallback ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-1 text-xs">
      {alert.new_value && (
        <p className="text-slate-300">{alert.new_value}</p>
      )}
      {alert.detection_source && (
        <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold pt-0.5">
          Source: {alert.detection_source.replace(/_/g, ' ')}
        </p>
      )}
    </div>
  )
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function AlertCard({ alert, isStaff, onStatusChange, onFalseAlarm }: Props) {
  const [busy, setBusy]               = useState<string | null>(null)
  const [shieldState, setShieldState] = useState<'idle' | 'launching' | 'active' | 'error'>('idle')
  const [scriptPreview, setScriptPreview] = useState<string | null>(null)

  const C  = alert.confidence_score ?? 0
  const st = alert.switch_type

  const borderCls = C >= 85 ? 'border-l-red-500'
    : C >= 70 ? 'border-l-orange-500'
    : C >= 60 ? 'border-l-yellow-500'
    : 'border-l-slate-700'

  const barCls = C > 70 ? 'bg-red-500'
    : C >= 40 ? 'bg-yellow-500'
    : 'bg-slate-600'

  const PriorityIcon = st === 'future_plan_change' ? AlertTriangle
    : (st === 'plan_changed' || st === 'termed' || st === 'fully_disenrolled') ? XCircle
    : alert.priority === 'critical' ? XCircle
    : alert.priority === 'high'     ? AlertTriangle
    : Bell

  const priorityCls = st === 'future_plan_change' ? 'text-orange-400'
    : alert.priority === 'critical' ? 'text-red-400'
    : alert.priority === 'high'     ? 'text-orange-400'
    : 'text-yellow-400'

  const statusCls = ({
    open:       'bg-red-500/10 text-red-400 border-red-500/20',
    contacted:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    mitigating: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    resolved:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dismissed:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
  } as Record<string, string>)[alert.status ?? 'open']
    ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20'

  const priorityLabel = st === 'future_plan_change'
    ? `HIGH — ${alert.carrier_display ?? alert.carrier ?? 'Unknown'}`
    : `CRITICAL — ${alert.carrier_display ?? alert.carrier ?? 'Unknown'}`

  const priorityLabelCls = st === 'future_plan_change' ? 'text-orange-400' : 'text-red-400'

  const isOpen       = alert.status === 'open'
  const isContacted  = alert.status === 'contacted'
  const isMitigating = alert.status === 'mitigating'
  const isActionable = isOpen || isContacted

  // Revenue at risk for this single alert
  const revenue = alert.estimated_revenue_at_risk ?? 35

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleStatusChange(status: AlertStatus) {
    setBusy(status)
    try {
      const supabase = createClient()
      await supabase
        .from('switch_alerts')
        .update({
          status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        })
        .eq('id', alert.id)
      onStatusChange?.(alert.id, status)
    } finally {
      setBusy(null)
    }
  }

  async function handleFalseAlarm() {
    setBusy('false_alarm')
    try {
      await fetch(`/api/alerts/${alert.id}/false-alarm`, { method: 'POST' })
      onFalseAlarm?.(alert.id)
    } finally {
      setBusy(null)
    }
  }

  async function handleLaunchShield() {
    if (!alert.bob_member_id) return
    setShieldState('launching')
    try {
      // 1. Transition to 'mitigating' in the DB
      const supabase = createClient()
      await supabase
        .from('switch_alerts')
        .update({ status: 'mitigating' })
        .eq('id', alert.id)
      onStatusChange?.(alert.id, 'mitigating')

      // 2. Fire the Maya AI script engine
      const res  = await fetch('/api/ai/generate-script', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ memberId: alert.bob_member_id, alertId: alert.id }),
      })
      const data = await res.json() as {
        success?: boolean; smsDraft?: string; phoneScript?: string; error?: string
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Script generation failed')
      }

      // 3. Surface a preview of the SMS draft
      setScriptPreview(data.smsDraft ?? data.phoneScript ?? null)
      setShieldState('active')
    } catch {
      setShieldState('error')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Card className={`rounded-2xl border border-slate-800 border-l-4 ${borderCls} bg-slate-900/60 overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start gap-4">

          {/* Priority icon */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-800">
            <PriorityIcon className={`w-4 h-4 ${priorityCls}`} />
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Priority label */}
            <p className={`text-[9px] font-black uppercase tracking-widest ${priorityLabelCls}`}>
              {priorityLabel}
            </p>

            {/* Member name + status badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-black text-white">
                {alert.member_full_name ?? (
                  <span className="text-slate-500 italic font-normal">Unknown Member</span>
                )}
              </p>
              <Badge className={`font-black uppercase text-[8px] px-2 h-5 cursor-default pointer-events-none ${statusCls}`}>
                {(alert.status ?? 'open').replace(/_/g, ' ')}
              </Badge>
              {isStaff && alert.broker_full_name && (
                <span className="text-[9px] text-slate-500 font-medium ml-auto">
                  {alert.broker_full_name}
                </span>
              )}
            </div>

            {/* Switch visualization */}
            <AlertBody alert={alert} />

            {/* Timestamp — verbose "Detected X hours ago" format */}
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <span className="text-[10px] text-slate-600 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgoVerbose(alert.detected_at)}
                <span className="text-slate-700 mx-1">·</span>
                {fmtFull(alert.detected_at)}
              </span>
              {revenue > 0 && (
                <span className="text-[9px] font-black text-amber-500/70 ml-auto">
                  ${revenue}/mo at risk
                </span>
              )}
              {C > 0 && (
                <span className={`text-[10px] font-black ${C >= 85 ? 'text-red-400' : C >= 70 ? 'text-orange-400' : 'text-yellow-400'}`}>
                  {C}% conf.
                </span>
              )}
            </div>

            {C > 0 && (
              <div className="h-0.5 w-full rounded-full bg-slate-800">
                <div
                  className={`h-0.5 rounded-full transition-all ${barCls}`}
                  style={{ width: `${Math.min(C, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Right-side action column */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">

            {/* LAUNCH SHIELD CAMPAIGN — primary action for open alerts */}
            {isOpen && alert.bob_member_id && shieldState === 'idle' && (
              <Button
                onClick={handleLaunchShield}
                disabled={!!busy}
                size="sm"
                className="h-8 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-violet-600 hover:bg-violet-500 text-white gap-1.5 shadow-lg shadow-violet-900/40 whitespace-nowrap"
              >
                <Sparkles className="w-3 h-3" />
                Launch Shield
              </Button>
            )}

            {shieldState === 'launching' && (
              <Button
                disabled
                size="sm"
                className="h-8 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-violet-600/60 text-violet-300 gap-1.5 whitespace-nowrap cursor-not-allowed"
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                Launching…
              </Button>
            )}

            {shieldState === 'active' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <ShieldCheck className="w-3 h-3 text-violet-400 shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-widest text-violet-400">
                  Shield Active
                </span>
              </div>
            )}

            {shieldState === 'error' && (
              <Button
                onClick={handleLaunchShield}
                size="sm"
                variant="ghost"
                className="h-8 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 gap-1 whitespace-nowrap"
              >
                <Sparkles className="w-3 h-3" />
                Retry Shield
              </Button>
            )}

            {/* Secondary actions */}
            {isOpen && (
              <Button
                variant="ghost"
                size="sm"
                disabled={!!busy}
                onClick={() => handleStatusChange('contacted')}
                className="h-7 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-yellow-400 hover:text-white hover:bg-yellow-500/20 gap-1 whitespace-nowrap"
              >
                <PhoneCall className="w-3 h-3" />
                {st === 'future_plan_change' ? 'Call Now' : 'Contacted'}
              </Button>
            )}

            {st === 'future_plan_change' && isOpen && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-orange-400 hover:text-white hover:bg-orange-500/20 gap-1"
              >
                <Link href="/dashboard/churn">
                  <ArrowLeftRight className="w-3 h-3" />Campaign
                </Link>
              </Button>
            )}

            {/* Resolve: available for contacted, mitigating, or open states */}
            {(isOpen || isContacted || isMitigating) && (
              <Button
                variant="ghost"
                size="sm"
                disabled={!!busy}
                onClick={() => handleStatusChange('resolved')}
                className="h-7 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:text-white hover:bg-emerald-500/20 gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />Resolve
              </Button>
            )}

            {/* False Alarm: only while open or contacted (not after Shield launched) */}
            {isActionable && (
              <Button
                variant="ghost"
                size="sm"
                disabled={!!busy}
                onClick={handleFalseAlarm}
                className="h-7 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-700/50 gap-1"
              >
                <Flag className="w-3 h-3" />False Alarm
              </Button>
            )}

            <Link href={`/dashboard/alerts/${alert.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-primary gap-1"
              >
                Details <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Inline AI script preview (shown after Shield is launched) ─────────── */}
      {shieldState === 'active' && scriptPreview && (
        <div className="mx-4 mb-4 p-3 rounded-xl bg-violet-500/5 border border-violet-500/15 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
            <p className="text-[9px] font-black uppercase tracking-widest text-violet-400">
              Maya AI · Outreach Draft Ready
            </p>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3">
            {scriptPreview}
          </p>
          <Link href={`/dashboard/scripts?alertId=${alert.id}`}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-0 text-[9px] font-black uppercase tracking-widest text-violet-400 hover:text-violet-300 gap-1"
            >
              View Full Script <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      )}
    </Card>
  )
}
