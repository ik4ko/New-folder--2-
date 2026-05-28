'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Users, FileCheck,
  CheckCircle2, XCircle, Clock, Bell, KeyRound, AlertTriangle,
  Trash2, Download, Activity, X,
} from 'lucide-react'

interface MemberRow {
  id: string
  mbi: string | null
  carrier: string
  carrier_display_name: string | null
  /** Set at roster upload, never overwritten — always shows original enrolled carrier */
  original_carrier_name: string | null
  member_id: string | null
  full_name: string | null
  /** Original enrolled plan — NOT overwritten when a switch is detected */
  plan_name: string | null
  /** New plan the member moved to (populated only when a switch is detected) */
  detected_plan_name: string | null
  /** New carrier the member moved to (populated only when a switch is detected) */
  detected_carrier_name: string | null
  status: string | null
  verification_status: string | null
  last_verified_at: string | null
  enrollment_status: string | null
  has_mbi: boolean | null
  last_marx_check: string | null
  future_plan_name: string | null
  future_effective_date: string | null
}

interface Props {
  members: MemberRow[]
}

// ── Switch state helpers ──────────────────────────────────────────────────────
// Priority order:
//   1. termed / disenrolled           → red  (no active MA plan)
//   2. verification_status = changed  → red  (already switched carriers/plans)
//   3. pending_switch OR switching    → orange (switch scheduled, not yet live)
//   4. active + marx checked          → green (verified, all good)
//   5. no MBI / unverified            → grey

function getEnrollmentBadge(member: MemberRow) {
  const es = member.enrollment_status
  const vs = member.verification_status

  // ── Termed / no MA plan ────────────────────────────────────────────────────
  if (es === 'termed' || es === 'disenrolled') {
    return {
      label: es === 'disenrolled' ? '✗ Disenrolled' : '✗ Left Plan',
      cls:  'bg-red-500/10 text-red-500 border-red-500/20',
      icon: XCircle,
      sub:  null,
      rowCls: 'bg-red-950/10 border-l-2 border-l-red-600',
    }
  }
  if (vs === 'termed' || vs === 'missing') {
    return {
      label: vs === 'missing' ? '✗ Not Found' : '✗ Left Plan',
      cls:  'bg-red-500/10 text-red-500 border-red-500/20',
      icon: XCircle,
      sub:  null,
      rowCls: 'bg-red-950/10 border-l-2 border-l-red-600',
    }
  }

  // ── Already switched ───────────────────────────────────────────────────────
  if (vs === 'changed') {
    // Build "Now:" line from detected fields (new plan), never from plan_name (original)
    const nowCarrier  = member.detected_carrier_name
    const nowPlan     = member.detected_plan_name
    const nowLabel    = nowPlan
      ? (nowCarrier && nowCarrier !== (member.original_carrier_name ?? member.carrier)
          ? `Now: ${nowCarrier} — ${nowPlan}`
          : `Now: ${nowPlan}`)
      : 'Plan changed — re-scan to see new plan'
    return {
      label: '🔴 Switched',
      cls:  'bg-red-500/10 text-red-400 border-red-500/20',
      icon: AlertTriangle,
      sub:  nowLabel,
      rowCls: 'bg-red-950/10 border-l-2 border-l-red-500',
    }
  }

  // ── Pending / upcoming switch ──────────────────────────────────────────────
  if (vs === 'pending_switch' || es === 'switching') {
    const futureDate = member.future_effective_date
    // CRITICAL: effective date is still in the future → broker still has time to act
    const isActionable = futureDate && new Date(futureDate) > new Date()

    if (isActionable) {
      const planLabel = member.future_plan_name
        ? `→ ${member.future_plan_name} · eff. ${fmtDate(futureDate)}`
        : `Effective ${fmtDate(futureDate)}`
      return {
        label: '🚨 Switching Soon',
        cls:  'bg-red-600/20 text-red-300 border-red-500/40',
        icon: AlertTriangle,
        sub:  `${planLabel} — CONTACT CLIENT NOW`,
        rowCls: 'bg-red-950/25 border-l-4 border-l-red-500',
      }
    }

    // Past effective date or no date — still flag it but lower urgency
    return {
      label: '⚠ Pending Switch',
      cls:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
      icon: AlertTriangle,
      sub:  member.future_plan_name
        ? `→ ${member.future_plan_name}${member.future_effective_date ? ' · eff. ' + fmtDate(member.future_effective_date) : ''}`
        : 'Switch scheduled — reach out now',
      rowCls: 'bg-orange-950/10 border-l-2 border-l-orange-500',
    }
  }

  // ── Verified active ────────────────────────────────────────────────────────
  if ((es === 'active' || vs === 'verified') && member.last_marx_check) {
    return {
      label: '✓ Verified',
      cls:  'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      icon: CheckCircle2,
      sub:  null,
      rowCls: '',
    }
  }

  // ── No MBI / unverified ────────────────────────────────────────────────────
  if (!member.has_mbi) {
    return {
      label: 'No MBI',
      cls:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
      icon: Clock,
      sub:  null,
      rowCls: '',
    }
  }

  return {
    label: 'Unverified',
    cls:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
    icon: Clock,
    sub:  null,
    rowCls: '',
  }
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '--'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

type Filter = 'all' | 'active' | 'critical' | 'termed'

export function BookMemberTable({ members }: Props) {
  const [filter, setFilter]               = useState<Filter>('active')
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [deleting, setDeleting]           = useState(false)
  const [checking, setChecking]           = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [mbiOverlay, setMbiOverlay]       = useState<{ name: string | null; mbi: string } | null>(null)
  const [mbiEditOverlay, setMbiEditOverlay] = useState<{ id: string; name: string | null } | null>(null)
  const [mbiInput, setMbiInput]             = useState('')
  const [savingMbi, setSavingMbi]           = useState(false)

  const activeCount = members.filter(m =>
    m.enrollment_status !== 'termed' && m.enrollment_status !== 'disenrolled' && m.status !== 'termed'
  ).length
  const termedCount = members.filter(m =>
    m.enrollment_status === 'termed' || m.enrollment_status === 'disenrolled' || m.status === 'termed'
  ).length
  const criticalCount = members.filter(m => {
    const futureDate = m.future_effective_date
    const isFutureSwitch = futureDate && new Date(futureDate) > new Date()
    return isFutureSwitch || m.verification_status === 'pending_switch' || m.enrollment_status === 'switching'
  }).length

  const filtered = members.filter(m => {
    const isTermed = m.enrollment_status === 'termed' || m.enrollment_status === 'disenrolled' || m.status === 'termed'
    if (filter === 'active') return !isTermed
    if (filter === 'termed') return isTermed
    if (filter === 'critical') {
      const futureDate = m.future_effective_date
      const isFutureSwitch = futureDate && new Date(futureDate) > new Date()
      return isFutureSwitch || m.verification_status === 'pending_switch' || m.enrollment_status === 'switching'
    }
    return true
  })

  const filteredIds = filtered.map(m => m.id)
  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selected.has(id))
  const someSelected = filteredIds.some(id => selected.has(id))
  const selectedIds = [...selected].filter(id => filteredIds.includes(id))

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) {
        filteredIds.forEach(id => next.delete(id))
      } else {
        filteredIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/book/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      if (res.ok) {
        setSelected(new Set())
        setShowDeleteConfirm(false)
        window.location.reload()
      } else {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? 'Delete failed — please try again')
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleExportCsv = () => {
    const rows = filtered.filter(m => selected.has(m.id))
    const header = ['Name', 'MBI', 'Original Carrier', 'Original Plan', 'Switched To Carrier', 'Switched To Plan', 'Enrollment Status', 'Last Verified']
    const csvRows = [
      header,
      ...rows.map(m => [
        m.full_name ?? '',
        m.mbi ?? '',
        m.original_carrier_name ?? m.carrier_display_name ?? m.carrier,
        m.plan_name ?? '',
        m.detected_carrier_name ?? '',
        m.detected_plan_name ?? '',
        m.enrollment_status ?? '',
        fmtDate(m.last_verified_at),
      ]),
    ]
    const csv = csvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'members-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const saveMbi = async (memberId: string, mbi: string) => {
    setSavingMbi(true)
    try {
      const res = await fetch('/api/book/update-mbi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, mbi }),
      })
      if (res.ok) {
        setMbiEditOverlay(null)
        setMbiInput('')
        window.location.reload()
      }
    } finally {
      setSavingMbi(false)
    }
  }

  const handleMarxCheck = async () => {
    setChecking(true)
    try {
      await fetch('/api/marx/bulk-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      window.location.reload()
    } finally {
      setChecking(false)
    }
  }

  if (members.length === 0) return null

  return (
    <>
      <Card className="rounded-3xl border-slate-800 bg-slate-900/60 shadow-sm overflow-hidden">
        {/* Table header bar */}
        <div className="border-b border-slate-800 px-5 py-3 flex items-center gap-2 flex-wrap">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm font-black uppercase tracking-tight text-white">All Members</p>
          <Badge className="ml-1 text-[8px] font-black bg-slate-800 text-slate-300 border-slate-700 border">
            {members.length}
          </Badge>
          <div className="ml-auto flex items-center gap-1">
            {criticalCount > 0 && (
              <button
                onClick={() => setFilter('critical')}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors border ${
                  filter === 'critical'
                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                    : 'text-red-500 border-red-800/50 hover:bg-red-950/30 animate-pulse'
                }`}
              >
                🚨 Critical ({criticalCount})
              </button>
            )}
            {(['all', 'active', 'termed'] as Filter[]).map(f => {
              const label = f === 'all'
                ? `All (${members.length})`
                : f === 'active'
                  ? `Active (${activeCount})`
                  : `Termed (${termedCount})`
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                    filter === f
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2 text-center">
            <p className="text-sm font-black uppercase tracking-tight text-slate-500">
              No {filter === 'termed' ? 'termed' : 'active'} members
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                      className="border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </TableHead>
                  {['Name', 'Carrier', 'Plan', 'Status', 'Last Verified', 'Actions'].map(h => (
                    <TableHead key={h} className="font-black uppercase text-[9px] tracking-widest text-slate-500 py-3 px-4">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(member => {
                  const isTermed = member.enrollment_status === 'termed' || member.enrollment_status === 'disenrolled' || member.status === 'termed'
                  const badge = getEnrollmentBadge(member)
                  const BadgeIcon = badge.icon
                  const needsAction = member.enrollment_status === 'switching'
                    || member.enrollment_status === 'termed'
                    || member.enrollment_status === 'disenrolled'
                    || member.verification_status === 'changed'
                    || member.verification_status === 'pending_switch'
                    || member.verification_status === 'termed'
                    || member.verification_status === 'missing'
                  const isChecked = selected.has(member.id)

                  return (
                    <TableRow
                      key={member.id}
                      className={`border-slate-800 hover:bg-slate-800/40 ${isTermed ? 'opacity-70' : ''} ${isChecked ? 'bg-primary/5' : ''} ${badge.rowCls ?? ''}`}
                    >
                      <TableCell className="px-4 py-3">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(member.id)}
                          aria-label={`Select ${member.full_name ?? member.id}`}
                          className="border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3 font-bold text-sm text-slate-200">
                        {member.full_name ?? <span className="text-slate-600 italic">Unknown</span>}
                      </TableCell>
                      <TableCell className="px-4 text-xs font-medium text-slate-400">
                        {member.original_carrier_name ?? member.carrier_display_name ?? member.carrier}
                      </TableCell>
                      <TableCell className="px-4 text-xs font-medium text-slate-400">
                        {member.plan_name ?? '--'}
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="space-y-0.5">
                          <Badge className={`font-black uppercase text-[8px] px-2 h-5 border flex items-center gap-1 w-fit ${badge.cls}`}>
                            <BadgeIcon className="w-2.5 h-2.5" />
                            {badge.label}
                          </Badge>
                          {badge.sub && (
                            <p className={`text-[8px] font-medium leading-tight max-w-[180px] truncate ${
                              badge.label.includes('🚨') ? 'text-red-300 font-black' : 'text-orange-400/70'
                            }`}>{badge.sub}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 text-xs text-slate-500">
                        {fmtDate(member.last_verified_at)}
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex items-center gap-1.5">
                          {needsAction && (
                            <Button asChild variant="ghost" size="sm"
                              className="h-6 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-white hover:bg-red-500/20">
                              <Link href="/dashboard/alerts">
                                <Bell className="w-3 h-3 mr-1" />Act
                              </Link>
                            </Button>
                          )}
                          {!isTermed && (
                            <Button asChild variant="ghost" size="sm"
                              className="h-6 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-700">
                              <Link href={`/dashboard/vcc/new?bob=${member.id}`}>
                                <FileCheck className="w-3 h-3 mr-1" />VCC
                              </Link>
                            </Button>
                          )}
                          <button
                            className={`flex items-center gap-1 h-6 px-2 rounded border text-[9px] font-black uppercase tracking-widest transition-colors ${
                              member.mbi
                                ? 'text-emerald-400 border-emerald-700 hover:bg-emerald-950'
                                : 'text-red-400 border-red-700 hover:bg-red-950'
                            }`}
                            onClick={() => {
                              if (member.mbi) {
                                setMbiOverlay({ name: member.full_name, mbi: member.mbi! })
                              } else {
                                setMbiInput('')
                                setMbiEditOverlay({ id: member.id, name: member.full_name })
                              }
                            }}
                          >
                            <KeyRound className="w-3 h-3" />MBI
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Floating action bar */}
      {someSelected && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/50 backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
            {selectedIds.length} selected
          </span>
          <div className="w-px h-4 bg-slate-700" />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportCsv}
            className="h-7 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
          >
            <Download className="w-3 h-3" />Export CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMarxCheck}
            disabled={checking}
            className="h-7 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:text-white hover:bg-emerald-500/20 gap-1.5"
          >
            <Activity className="w-3 h-3" />{checking ? 'Checking…' : 'Run MARx Check'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDeleteConfirm(true)}
            className="h-7 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-white hover:bg-red-500/20 gap-1.5"
          >
            <Trash2 className="w-3 h-3" />Delete
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-slate-500 hover:text-slate-300 ml-1"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-3xl bg-slate-900 border border-slate-700 p-8 max-w-sm w-full mx-4 shadow-2xl">
            <p className="text-base font-black uppercase tracking-tight text-white">
              Delete {selectedIds.length} member{selectedIds.length > 1 ? 's' : ''}?
            </p>
            <p className="text-xs text-slate-400 mt-2">This cannot be undone. All records will be permanently removed.</p>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl font-black uppercase text-[9px] tracking-widest border-slate-700 text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl font-black uppercase text-[9px] tracking-widest bg-red-500 hover:bg-red-600 text-white"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MBI edit overlay (no MBI on file) */}
      {mbiEditOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setMbiEditOverlay(null)}
        >
          <div
            className="rounded-3xl bg-slate-900 border border-slate-700 p-8 max-w-xs w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medicare ID (MBI)</p>
              <button onClick={() => setMbiEditOverlay(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            {mbiEditOverlay.name && (
              <p className="text-xs text-slate-400 mb-3">{mbiEditOverlay.name}</p>
            )}
            <div className="text-xs p-3 rounded-lg bg-gray-900 border border-red-800">
              <p className="text-red-400 mb-2">No MBI on file</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter MBI (e.g. 1EG4TE5MK73)"
                  maxLength={11}
                  value={mbiInput}
                  className="flex-1 px-2 py-1 text-xs rounded bg-gray-800 border border-gray-600 text-white font-mono uppercase"
                  onChange={e => setMbiInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                />
                <button
                  onClick={() => saveMbi(mbiEditOverlay.id, mbiInput)}
                  disabled={savingMbi || mbiInput.length !== 11}
                  className="px-3 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                >
                  {savingMbi ? 'Saving…' : 'Save'}
                </button>
              </div>
              <p className="text-gray-500 mt-1 text-xs">MBI is 11 characters: letters and numbers only</p>
            </div>
          </div>
        </div>
      )}

      {/* MBI overlay */}
      {mbiOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setMbiOverlay(null)}
        >
          <div
            className="rounded-3xl bg-slate-900 border border-slate-700 p-8 max-w-xs w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medicare ID (MBI)</p>
              <button onClick={() => setMbiOverlay(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            {mbiOverlay.name && (
              <p className="text-xs text-slate-400 mb-3">{mbiOverlay.name}</p>
            )}
            <p className="text-2xl font-mono font-black tracking-[0.2em] text-white select-all">
              {mbiOverlay.mbi}
            </p>
            <p className="text-[9px] text-slate-600 mt-3 uppercase tracking-widest">Click outside to close · Do not share PHI</p>
          </div>
        </div>
      )}
    </>
  )
}
