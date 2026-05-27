import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CollectionSidebar } from '@/components/collection-sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { DollarSign, FileText, BarChart3, AlertTriangle, Clock, Shield } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { FaxAuditExport } from './fax-audit-export'

type FaxStatus = 'pending' | 'sent' | 'failed' | 'signed' | 'expired' | 'no_fax'

const FAX_CONFIG: Record<FaxStatus, { label: string; cls: string }> = {
  pending: { label: 'Pending',  cls: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  sent:    { label: 'Faxed',    cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  signed:  { label: 'Signed',   cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' },
  failed:  { label: 'Failed',   cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
  expired: { label: 'Expired',  cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
  no_fax:  { label: 'No Fax',   cls: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
}

function fmt(d: string | null | undefined) {
  if (!d) return '--'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function daysLeft(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

const AVG_COMMISSION = 600

export default async function ManagerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Parallel role detection
  const [{ data: agency }, { data: brokerRow }] = await Promise.all([
    supabase.from('agencies').select('id').eq('owner_id', user.id).maybeSingle(),
    supabase.from('brokers').select('role, agency_id').eq('user_id', user.id).maybeSingle(),
  ])

  const staffRoles = ['agency_owner', 'agency_admin', 'customer_service']
  const isStaff = staffRoles.includes(brokerRow?.role ?? '')
  const isOwner = !!agency
  if (!isStaff) redirect('/dashboard')

  const agencyId = agency?.id ?? brokerRow?.agency_id

  // -- Section A: Revenue at Risk --------------------------------------------
  const { count: openSwitchCount } = await supabase
    .from('switch_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open')
    .eq('alert_type', 'missing_from_roster')

  const revenueAtRisk = (openSwitchCount ?? 0) * AVG_COMMISSION

  // -- Section B: Fax Audit Trail --------------------------------------------
  const { data: submissions } = await supabase
    .from('vcc_submissions')
    .select('id, client_name, carrier, fax_status, fax_sent_at, fax_confirmation_id, deadline_at, filled_pdf_path, broker:broker_id (first_name, last_name)')
    .order('deadline_at', { ascending: true })

  const allSubmissions = submissions ?? []

  // Build export data
  const exportData = allSubmissions.map(s => ({
    client_name: s.client_name,
    carrier: s.carrier,
    broker_name: s.broker ? `${(s.broker as any).first_name} ${(s.broker as any).last_name}` : '--',
    fax_status: s.fax_status ?? 'pending',
    fax_sent_at: s.fax_sent_at ?? null,
    deadline_at: s.deadline_at,
    fax_confirmation_id: s.fax_confirmation_id ?? null,
  }))

  // -- Section C: Broker Performance ----------------------------------------
  const { data: brokers } = await supabase
    .from('brokers')
    .select('id, first_name, last_name, role')
    .eq('agency_id', agencyId)
    .order('last_name')

  const allBrokers = brokers ?? []

  // Parallel count queries per metric
  const supabaseAdmin = createServiceClient()

  const [clientCounts, openAlertCounts, totalAlertCounts, resolvedAlertCounts, VCCCounts, campaignCounts, aorLockedCounts, protectionStats] =
    await Promise.all([
      // clients per broker
      supabase.from('ghl_contacts').select('broker_id').then(r =>
        groupCount(r.data ?? [], 'broker_id')
      ),
      // open alerts per broker
      supabase.from('switch_alerts').select('broker_id').in('status', ['open', 'contacted']).then(r =>
        groupCount(r.data ?? [], 'broker_id')
      ),
      // total alerts per broker
      supabase.from('switch_alerts').select('broker_id').then(r =>
        groupCount(r.data ?? [], 'broker_id')
      ),
      // resolved alerts per broker
      supabase.from('switch_alerts').select('broker_id').eq('status', 'resolved').then(r =>
        groupCount(r.data ?? [], 'broker_id')
      ),
      // VCC submissions per broker
      supabase.from('vcc_submissions').select('broker_id').then(r =>
        groupCount(r.data ?? [], 'broker_id')
      ),
      // active campaigns per broker
      supabase.from('campaign_enrollments').select('broker_id').eq('status', 'active').then(r =>
        groupCount(r.data ?? [], 'broker_id')
      ),
      // AOR locked per broker
      supabaseAdmin.from('aor_submissions').select('broker_id').in('status', ['faxed', 'confirmed']).then(r =>
        groupCount(r.data ?? [], 'broker_id')
      ),
      // Agency protection stats
      supabaseAdmin.from('agency_protection_stats')
        .select('total_contacts, locked_contacts, protection_rate')
        .eq('agency_id', agencyId)
        .maybeSingle()
        .then(r => r.data ?? null),
    ])

  const protectionRate = Number(protectionStats?.protection_rate ?? 0)
  const totalProtected = Number(protectionStats?.total_contacts ?? 0)
  const lockedProtected = Number(protectionStats?.locked_contacts ?? 0)
  const rateColor = protectionRate >= 70 ? 'text-emerald-600' : protectionRate >= 30 ? 'text-amber-500' : 'text-red-500'

  const brokerStats = allBrokers
    .map(b => {
      const total = totalAlertCounts[b.id] ?? 0
      const resolved = resolvedAlertCounts[b.id] ?? 0
      const saveRate = total > 0 ? Math.round((resolved / total) * 100) : null
      return {
        id: b.id,
        name: `${b.first_name} ${b.last_name}`,
        role: b.role,
        clients: clientCounts[b.id] ?? 0,
        openAlerts: openAlertCounts[b.id] ?? 0,
        VCC: VCCCounts[b.id] ?? 0,
        activeCampaigns: campaignCounts[b.id] ?? 0,
        aorLocked: aorLockedCounts[b.id] ?? 0,
        saveRate,
      }
    })
    .sort((a, b) => {
      // null save rate (no alerts) -> end; lower save rate -> higher priority
      if (a.saveRate === null && b.saveRate === null) return 0
      if (a.saveRate === null) return 1
      if (b.saveRate === null) return -1
      return a.saveRate - b.saveRate
    })

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center gap-4 bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground uppercase tracking-tight">Agency Manager</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Revenue · Compliance · Performance
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full pb-32 space-y-8">

          {/* -- Agency Protection Rate ------------------------------------ */}
          <Card className="rounded-3xl border border-emerald-200 bg-emerald-500/5 shadow-sm">
            <CardContent className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Agency Protection Rate</p>
                  <p className={`text-5xl font-black tracking-tighter ${rateColor}`}>
                    {protectionRate}%
                  </p>
                  <p className="text-sm font-bold text-muted-foreground mt-1">
                    {lockedProtected} of {totalProtected} clients have AORs on file
                  </p>
                </div>
              </div>
              <Link href="/dashboard/aor" className="shrink-0">
                <Button variant="outline" className="rounded-2xl font-black uppercase text-[10px] tracking-widest border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2">
                  <Shield className="w-4 h-4" /> Manage AORs
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* -- Section A: Revenue at Risk -------------------------------- */}
          <Card className="rounded-3xl border border-red-200 bg-red-500/5 shadow-sm">
            <CardContent className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-red-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Revenue at Risk</p>
                  <p className="text-5xl font-black text-red-600 tracking-tighter">
                    ${revenueAtRisk.toLocaleString()}
                  </p>
                  <p className="text-[11px] font-bold text-red-400 mt-1">
                    {openSwitchCount ?? 0} open switch alert{openSwitchCount !== 1 ? 's' : ''} × ${AVG_COMMISSION} avg annual commission
                  </p>
                </div>
              </div>
              <Button asChild variant="outline"
                className="rounded-2xl font-black uppercase text-[10px] tracking-widest border-red-200 text-red-600 hover:bg-red-500/10 h-10 px-5 gap-2">
                <Link href="/dashboard/churn">
                  <AlertTriangle className="w-4 h-4" /> View Alerts
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* -- Section B: Fax Audit Trail -------------------------------- */}
          <Card className="rounded-3xl border border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Compliance Vault -- Fax Audit Trail
                </CardTitle>
                {isOwner && <FaxAuditExport submissions={exportData} />}
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {allSubmissions.length === 0 ? (
                <div className="py-16 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">
                  No VCC submissions yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-transparent border-none">
                      {['Client', 'Carrier', 'Broker', 'Status', 'Sent At', 'Deadline', 'PDF'].map(h => (
                        <TableHead key={h} className="font-black uppercase text-[9px] tracking-widest text-muted-foreground py-4 px-4">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allSubmissions.map(s => {
                      const status = (s.fax_status ?? 'pending') as FaxStatus
                      const cfg = FAX_CONFIG[status] ?? FAX_CONFIG.pending
                      const dl = daysLeft(s.deadline_at)
                      const broker = s.broker as unknown as { first_name: string; last_name: string } | null
                      return (
                        <TableRow key={s.id} className="border-border/50 hover:bg-muted/20">
                          <TableCell className="px-4 py-3 font-bold text-sm">{s.client_name}</TableCell>
                          <TableCell className="px-4 text-[10px] font-bold uppercase text-muted-foreground">{s.carrier}</TableCell>
                          <TableCell className="px-4 text-[10px] text-muted-foreground">
                            {broker ? `${broker.first_name} ${broker.last_name}` : '--'}
                          </TableCell>
                          <TableCell className="px-4">
                            <Badge className={`text-[8px] font-black uppercase px-2 border ${cfg.cls}`}>{cfg.label}</Badge>
                          </TableCell>
                          <TableCell className="px-4 text-[10px] text-muted-foreground">{fmt(s.fax_sent_at)}</TableCell>
                          <TableCell className="px-4">
                            <span className={`text-[10px] font-bold flex items-center gap-1 ${dl < 14 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {dl < 14 && <Clock className="w-3 h-3" />}
                              {fmt(s.deadline_at)}
                              {dl > 0 && dl < 14 && ` (${dl}d)`}
                            </span>
                          </TableCell>
                          <TableCell className="px-4">
                            {s.filled_pdf_path ? (
                              <Button asChild variant="ghost" size="sm"
                                className="h-7 px-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary">
                                <Link href={`/dashboard/vcc/${s.id}`}>View</Link>
                              </Button>
                            ) : <span className="text-[10px] text-muted-foreground/40">--</span>}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* -- Section C: Broker Performance ----------------------------- */}
          <Card className="rounded-3xl border border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Broker Performance
                <span className="text-[9px] font-bold text-muted-foreground normal-case">sorted by save rate -- worst first</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {brokerStats.length === 0 ? (
                <div className="py-16 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">
                  No brokers on this agency yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-transparent border-none">
                      {['Broker', 'Role', 'Clients', 'Open Alerts', 'VCC', 'AORs Locked', 'Campaigns', 'Save Rate'].map(h => (
                        <TableHead key={h} className="font-black uppercase text-[9px] tracking-widest text-muted-foreground py-4 px-4">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brokerStats.map(b => (
                      <TableRow key={b.id} className="border-border/50 hover:bg-muted/20">
                        <TableCell className="px-4 py-3 font-bold text-sm">{b.name}</TableCell>
                        <TableCell className="px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          {b.role.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="px-4 font-bold text-sm">{b.clients}</TableCell>
                        <TableCell className="px-4">
                          {b.openAlerts > 0 ? (
                            <span className="text-red-600 font-black text-sm">{b.openAlerts}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold text-sm">0</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 font-bold text-sm">{b.VCC}</TableCell>
                        <TableCell className="px-4">
                          <span className={`text-sm font-black flex items-center gap-1 ${b.aorLocked > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {b.aorLocked > 0 && <Shield className="w-3 h-3" />}
                            {b.aorLocked}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 font-bold text-sm">{b.activeCampaigns}</TableCell>
                        <TableCell className="px-4">
                          {b.saveRate !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${b.saveRate >= 80 ? 'bg-emerald-500' : b.saveRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${b.saveRate}%` }}
                                />
                              </div>
                              <span className={`text-[11px] font-black ${b.saveRate >= 80 ? 'text-emerald-600' : b.saveRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                {b.saveRate}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40">No alerts</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function groupCount(rows: Array<Record<string, unknown>>, key: string): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const val = row[key] as string | null
    if (val) acc[val] = (acc[val] ?? 0) + 1
    return acc
  }, {})
}
