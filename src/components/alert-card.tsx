'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  AlertTriangle, Bell, CheckCircle2, Clock,
  PhoneCall, XCircle, ArrowRight, Flag, ArrowLeftRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
}

interface Props {
  alert: AlertRow
  isStaff?: boolean
  onStatusChange?: (alertId: string, status: 'contacted' | 'resolved') => void
  onFalseAlarm?: (alertId: string) => void
}

function timeAgo(d: string | null | undefined) {
  if (!d) return ''
  const ms = Date.now() - new Date(d).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '--'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
  })
}

function fmtFull(d: string | null | undefined) {
  if (!d) return '--'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: '2-digit',
    hour: 'numeric', minute: '2-digit',
  })
}

function AlertBody({ alert }: { alert: AlertRow }) {
  const st = alert.switch_type

  const planDisplay = (alert.member_plan && alert.member_plan !== 'unknown' && alert.member_plan !== 'Unknown Plan')
    ? alert.member_plan
    : (alert.carrier_display ?? alert.carrier) || 'Unknown Plan'

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

  // Fallback: generic display for non-MARx alerts
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

export function AlertCard({ alert, isStaff, onStatusChange, onFalseAlarm }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const C = alert.confidence_score ?? 0
  const st = alert.switch_type

  const borderCls = C >= 85
    ? 'border-l-red-500'
    : C >= 70
    ? 'border-l-orange-500'
    : C >= 60
    ? 'border-l-yellow-500'
    : 'border-l-slate-700'

  const barCls = C > 70
    ? 'bg-red-500'
    : C >= 40
    ? 'bg-yellow-500'
    : 'bg-slate-600'

  const PriorityIcon = st === 'future_plan_change'
    ? AlertTriangle
    : st === 'plan_changed' || st === 'termed' || st === 'fully_disenrolled'
    ? XCircle
    : alert.priority === 'critical'
    ? XCircle
    : alert.priority === 'high'
    ? AlertTriangle
    : Bell

  const priorityCls = st === 'future_plan_change'
    ? 'text-orange-400'
    : alert.priority === 'critical'
    ? 'text-red-400'
    : alert.priority === 'high'
    ? 'text-orange-400'
    : 'text-yellow-400'

  const statusCls = ({
    open: 'bg-red-500/10 text-red-400 border-red-500/20',
    contacted: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dismissed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  } as Record<string, string>)[alert.status ?? 'open'] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20'

  const priorityLabel = st === 'future_plan_change'
    ? `HIGH — ${alert.carrier_display ?? alert.carrier ?? 'Unknown'}`
    : `CRITICAL — ${alert.carrier_display ?? alert.carrier ?? 'Unknown'}`

  const priorityLabelCls = st === 'future_plan_change'
    ? 'text-orange-400'
    : 'text-red-400'

  const isOpen = alert.status === 'open'
  const isContacted = alert.status === 'contacted'
  const isActionable = isOpen || isContacted

  const callLabel = st === 'future_plan_change' && alert.effective_date
    ? `Call Now — Save Before ${fmtDate(alert.effective_date)}`
    : 'I Called Them'

  async function handleStatusChange(status: 'contacted' | 'resolved') {
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

  return (
    <Card className={`rounded-2xl border border-slate-800 border-l-4 ${borderCls} bg-slate-900/60 p-4`}>
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-800">
          <PriorityIcon className={`w-4 h-4 ${priorityCls}`} />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Priority label */}
          <p className={`text-[9px] font-black uppercase tracking-widest ${priorityLabelCls}`}>
            {priorityLabel}
          </p>

          {/* Member name + status */}
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

          {/* Switch-type-specific body */}
          <AlertBody alert={alert} />

          {/* Timestamp + confidence */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <span className="text-[10px] text-slate-600 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(alert.detected_at)} · {fmtFull(alert.detected_at)}
            </span>
            {C > 0 && (
              <span className={`text-[10px] font-black ml-auto ${C >= 85 ? 'text-red-400' : C >= 70 ? 'text-orange-400' : 'text-yellow-400'}`}>
                {C}% confidence
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

        <div className="flex flex-col items-end gap-1 shrink-0">
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
          {isActionable && (
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
    </Card>
  )
}
