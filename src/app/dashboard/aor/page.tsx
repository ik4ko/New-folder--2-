import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Shield, Clock, Lock, AlertTriangle, FileText } from 'lucide-react'
import { getAORsForAgency } from '@/app/actions/aor'
import { AORRowActions } from './aor-row-actions'
import { RequestLockModal } from './request-lock-modal'
import type { AORSubmission } from '@/app/actions/aor'

type Status = AORSubmission['status']
type Method = AORSubmission['signature_method']

const METHOD_CONFIG: Record<Method, { label: string; cls: string }> = {
  email_link:    { label: 'Email Link',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  sms_link:      { label: 'SMS',         cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  manual_upload: { label: 'Manual',      cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  in_person:     { label: 'In Person',   cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  docusign:      { label: 'DocuSign',    cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
}

const STATUS_CONFIG: Record<Status, { label: string; cls: string }> = {
  prepared:     { label: 'Prepared',           cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  client_sent:  { label: 'Awaiting Signature', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  client_signed:{ label: 'Counter-Sign Needed',cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  broker_signed:{ label: 'Broker Signed',      cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  faxed:        { label: 'Faxed',              cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  confirmed:    { label: 'Confirmed',          cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  expired:      { label: 'Expired',            cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  rejected:     { label: 'Rejected',           cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const STAT_COLORS: Record<string, string> = {
  'Total AORs':         'text-slate-400 bg-slate-800',
  'Pending Signatures': 'text-amber-400 bg-amber-500/10',
  'Locked':             'text-emerald-400 bg-emerald-500/10',
  'Expired':            'text-red-400 bg-red-500/10',
}

function fmt(d: string | null | undefined) {
  if (!d) return '--'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}

export default async function AORPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Determine role server-side — 2 queries in parallel
  const [{ data: agency }, { data: brokerRow }] = await Promise.all([
    supabase.from('agencies').select('id').eq('owner_id', user.id).maybeSingle(),
    supabase.from('brokers').select('id, role, agency_id').eq('user_id', user.id).maybeSingle(),
  ])
  const isPrincipal = !!agency || ['agency_owner', 'agency_admin'].includes(brokerRow?.role ?? '')
  const isCS        = brokerRow?.role === 'customer_service'
  const isStaff     = isPrincipal || isCS
  const filterBrokerId = isStaff ? undefined : (brokerRow?.id ?? undefined)

  let submissions: AORSubmission[] = []
  let stats = { total: 0, pending: 0, locked: 0, expired: 0 }
  let protectionRate = 0
  let totalContacts = 0
  let lockedContacts = 0

  try {
    const result = await getAORsForAgency(filterBrokerId)
    submissions = result.submissions
    stats = result.stats
    protectionRate = result.protectionRate
    totalContacts = result.totalContacts
    lockedContacts = result.lockedContacts
  } catch (e) {
    console.error('[AORPage] getAORsForAgency failed:', e)
  }

  const rateColor = protectionRate >= 70 ? 'text-emerald-400' : protectionRate >= 30 ? 'text-amber-400' : 'text-red-400'
  const rateBg    = protectionRate >= 70 ? 'bg-emerald-500/10' : protectionRate >= 30 ? 'bg-amber-500/10' : 'bg-red-500/10'

  const statRows = [
    { label: 'Total AORs',         value: stats.total,   icon: FileText },
    { label: 'Pending Signatures', value: stats.pending, icon: Clock },
    { label: 'Locked',             value: stats.locked,  icon: Lock },
    { label: 'Expired',            value: stats.expired, icon: AlertTriangle },
  ]

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-tight">Aegis Lock</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              AOR Fulfillment -- CMS-1696
            </p>
          </div>
        </div>
        <RequestLockModal />
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
        {/* Description */}
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
          <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
            Aegis Lock secures your relationship with each client by filing a CMS-1696 Appointment of Representative form with their carrier. Once locked, you have the legal right to speak on their behalf, resolve issues, and protect their coverage. Locked clients are significantly less likely to switch brokers.
          </p>
        </div>

        {/* Protection Rate */}
        <Card className="rounded-2xl border-slate-800 bg-slate-900/60 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${rateBg}`}>
              <Shield className={`w-6 h-6 ${rateColor}`} />
            </div>
            <div>
              <p className={`text-3xl font-black ${rateColor}`}>{protectionRate}%</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {isStaff ? 'Agency' : 'My'} Protection Rate -- {lockedContacts} of {totalContacts} clients locked
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statRows.map(({ label, value, icon: Icon }) => {
            const colorCls = STAT_COLORS[label] ?? 'text-slate-400 bg-slate-800'
            return (
              <Card key={label} className="rounded-2xl border-slate-800 bg-slate-900/60 shadow-sm">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorCls}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* AOR Table */}
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center">
              <Lock className="w-10 h-10 text-slate-600" />
            </div>
            <div>
              <p className="text-lg font-black uppercase tracking-tight text-white">No AOR Submissions Yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Click <strong className="text-white">Request Lock</strong> above to start an AOR for a client, or
                initiate from the <a href="/dashboard/retention" className="text-primary underline underline-offset-2">My Book</a> page.
              </p>
            </div>
          </div>
        ) : (
          <Card className="rounded-3xl border-slate-800 bg-slate-900/60 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" /> AOR Submissions
                <Badge className="ml-1 text-[8px] font-black bg-slate-800 text-slate-300 border-slate-700 border">
                  {submissions.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-800">
                    {['Client', 'Carrier', 'Method', 'Status', 'Sent', 'Signed', 'Fax', 'Actions'].map(h => (
                      <TableHead key={h} className="font-black uppercase text-[9px] tracking-widest text-slate-500 py-4 px-4">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map(sub => {
                    const cfg = STATUS_CONFIG[sub.status]
                    const mc = METHOD_CONFIG[sub.signature_method] ?? METHOD_CONFIG.email_link
                    return (
                      <TableRow key={sub.id} className="border-slate-800 hover:bg-slate-800/40">
                        <TableCell className="px-4 py-3 font-bold text-sm text-slate-200">{sub.client_name}</TableCell>
                        <TableCell className="px-4 text-xs font-medium text-slate-400">{sub.carrier}</TableCell>
                        <TableCell className="px-4">
                          <Badge className={`font-black uppercase text-[9px] px-2 h-5 border ${mc.cls}`}>
                            {mc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4">
                          <Badge className={`font-black uppercase text-[9px] px-2 h-5 border ${cfg.cls}`}>
                            {cfg.label}
                            {sub.status === 'client_sent' && sub.created_at && (
                              <span className="ml-1 opacity-60">· {daysSince(sub.created_at)}d</span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 text-xs text-slate-500">{fmt(sub.created_at)}</TableCell>
                        <TableCell className="px-4 text-xs text-slate-500">{fmt(sub.client_signed_at)}</TableCell>
                        <TableCell className="px-4">
                          {sub.fax_status === 'sent' || sub.fax_status === 'confirmed' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-black uppercase text-[9px] px-2 h-5 border">
                              {sub.fax_status}
                            </Badge>
                          ) : sub.fax_status === 'failed' ? (
                            <Badge className="bg-red-500/10 text-red-400 border-red-500/20 font-black uppercase text-[9px] px-2 h-5 border">failed</Badge>
                          ) : (
                            <span className="text-xs text-slate-600">--</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4">
                          <AORRowActions submission={sub} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
