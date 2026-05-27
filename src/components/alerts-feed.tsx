'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { AlertCard, type AlertRow } from '@/components/alert-card'

type Filter = 'all' | 'open' | 'contacted' | 'resolved'
type TimeFilter = 'today' | 'week' | 'all'

interface Props {
  initialAlerts: AlertRow[]
  agencyId: string
  isStaff?: boolean
}

function requestPushPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function firePushNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/icon.svg' })
}

export function AlertsFeed({ initialAlerts, agencyId, isStaff }: Props) {
  const [alerts, setAlerts] = useState<AlertRow[]>(initialAlerts)
  const [filter, setFilter] = useState<Filter>('open')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    requestPushPermission()
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('switch_alerts_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'switch_alerts',
          filter: `agency_id=eq.${agencyId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const raw = payload.new as AlertRow
            const incoming: AlertRow = {
              ...raw,
              member_full_name: null,
              member_plan: raw.previous_value,
              carrier_display: raw.carrier,
            }
            setAlerts(prev => [incoming, ...prev])

            const name = incoming.member_full_name ?? 'A member'
            const carrier = incoming.carrier_display ?? incoming.carrier ?? 'Unknown Carrier'
            toast({
              title: '⚠️ New Switch Alert',
              description: `${name} may have switched plans — ${carrier}`,
              variant: 'destructive',
            })
            firePushNotification(
              'New Switch Alert — AegisSage',
              `${name} may have left ${carrier}`
            )
          } else if (payload.eventType === 'UPDATE') {
            setAlerts(prev =>
              prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a)
            )
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [agencyId, toast])

  function handleStatusChange(alertId: string, status: 'contacted' | 'resolved') {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status } : a))
  }

  function handleFalseAlarm(alertId: string) {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'dismissed' } : a))
  }

  const now = Date.now()
  const DAY_MS  = 86_400_000
  const WEEK_MS = 7 * DAY_MS

  const filtered = alerts.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false
    if (timeFilter === 'today') {
      if (now - new Date(a.detected_at ?? 0).getTime() > DAY_MS) return false
    } else if (timeFilter === 'week') {
      if (now - new Date(a.detected_at ?? 0).getTime() > WEEK_MS) return false
    }
    if (search) {
      const q = search.toLowerCase()
      return (
        (a.member_full_name ?? '').toLowerCase().includes(q) ||
        (a.carrier_display ?? a.carrier ?? '').toLowerCase().includes(q) ||
        (a.member_plan ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const openCount      = alerts.filter(a => a.status === 'open').length
  const contactedCount = alerts.filter(a => a.status === 'contacted').length
  const resolvedCount  = alerts.filter(a => a.status === 'resolved').length

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-900 rounded-xl border border-slate-800 p-1">
          {([
            ['all',       `All (${alerts.length})`],
            ['open',      `Open (${openCount})`],
            ['contacted', `Contacted (${contactedCount})`],
            ['resolved',  `Resolved (${resolvedCount})`],
          ] as [Filter, string][]).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                filter === f
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-slate-900 rounded-xl border border-slate-800 p-1">
          {([
            ['today', 'Today'],
            ['week',  'This Week'],
            ['all',   'All Time'],
          ] as [TimeFilter, string][]).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                timeFilter === f
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search member, carrier..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto h-9 w-56 bg-slate-900 border border-slate-800 rounded-xl px-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Alert cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500/40" />
          <p className="text-sm font-black uppercase tracking-tight text-slate-500">
            No alerts match this filter
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isStaff={isStaff}
              onStatusChange={handleStatusChange}
              onFalseAlarm={handleFalseAlarm}
            />
          ))}
        </div>
      )}
    </div>
  )
}
