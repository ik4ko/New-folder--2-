import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, User, Phone, Mail, AlertTriangle, Lock, Shield,
  FileCheck, Radar, Megaphone, Clock, ExternalLink,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-500 text-white border-red-600',
  high:     'bg-amber-500 text-white border-amber-600',
  medium:   'bg-yellow-400/20 text-yellow-700 border-yellow-400/40',
  low:      'bg-emerald-400/15 text-emerald-700 border-emerald-400/40',
}

const AOR_COLORS: Record<string, string> = {
  none:    'bg-slate-100 text-slate-500 border-slate-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  locked:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  expired: 'bg-red-50 text-red-600 border-red-200',
}

function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <Card className="rounded-3xl border border-border shadow-sm">
      <CardHeader className="bg-muted/30 border-b pb-4">
        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value ?? <span className="text-muted-foreground">—</span>}</p>
    </div>
  )
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>
}) {
  const { contactId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const supabaseAdmin = createServiceClient()

  // Resolve the caller's role and agency
  const { data: ownerAgency } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle()

  const { data: callerBroker } = await supabase
    .from('brokers')
    .select('id, agency_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  const agencyId = ownerAgency?.id ?? callerBroker?.agency_id ?? null
  const role = ownerAgency ? 'agency_owner' : callerBroker?.role ?? null
  const isStaff = role === 'agency_owner' || role === 'agency_admin' || role === 'customer_service'
  const isBrokerRole = role === 'broker' || role === 'solo_broker'

  if (!agencyId) redirect('/dashboard')

  // Fetch the contact
  const { data: contact } = await supabaseAdmin
    .from('ghl_contacts')
    .select(`
      id, ghl_contact_id, full_name, email, phone,
      risk_level, risk_score, current_plan_id, enrollment_status,
      assigned_broker_id, last_checked_at, aor_status, status,
      agency_id
    `)
    .eq('ghl_contact_id', contactId)
    .eq('agency_id', agencyId)
    .maybeSingle()

  if (!contact) redirect('/dashboard/retention')

  // Broker access check: broker can only view their own assigned contacts
  if (isBrokerRole && callerBroker && contact.assigned_broker_id !== callerBroker.id) {
    redirect('/dashboard/retention')
  }

  // Fetch assigned broker name
  let assignedBrokerName: string | null = null
  if (contact.assigned_broker_id) {
    const { data: ab } = await supabaseAdmin
      .from('brokers')
      .select('first_name, last_name')
      .eq('id', contact.assigned_broker_id)
      .maybeSingle()
    if (ab) assignedBrokerName = `${ab.first_name} ${ab.last_name}`
  }

  // Parallel data fetch
  const [
    { data: aorSubmissions },
    { data: vccForms },
    { data: switchAlerts },
    { data: campaigns },
    { data: timeline },
  ] = await Promise.all([
    supabaseAdmin
      .from('aor_submissions')
      .select('id, status, carrier, created_at, client_signed_at, fax_status, broker_name, signature_method')
      .eq('ghl_contact_id', contactId)
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(5),

    supabaseAdmin
      .from('vcc_submissions')
      .select('id, carrier, client_name, fax_status, send_scheduled_at, created_at')
      .eq('ghl_contact_id', contactId)
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(10),

    supabaseAdmin
      .from('switch_alerts')
      .select('id, alert_type, carrier, priority, status, created_at')
      .eq('ghl_contact_id', contactId)
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(10),

    supabaseAdmin
      .from('campaign_enrollments')
      .select('id, status, triggered_by, enrolled_at, completed_at, metadata')
      .eq('ghl_contact_id', contactId)
      .eq('agency_id', agencyId)
      .order('enrolled_at', { ascending: false })
      .limit(5),

    supabaseAdmin
      .from('audit_log')
      .select('id, action, created_at, details, metadata')
      .eq('agency_id', agencyId)
      .or(`details->>'ghl_contact_id'.eq.${contactId},details->>'submission_id'.not.is.null`)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(res => res), // non-fatal — timeline is best-effort
  ])

  const ghlBaseUrl = `https://app.gohighlevel.com/contacts/${contactId}`
  const aorStatus = contact.aor_status ?? 'none'
  const activeAOR = aorSubmissions?.find(a => a.status === 'client_signed' || a.status === 'broker_signed' || a.status === 'faxed' || a.status === 'confirmed' || a.status === 'pending' || a.status === 'client_sent')

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background">
      {/* Top bar */}
      <header className="h-16 border-b border-border px-8 flex items-center gap-4 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest">
          <Link href="/dashboard/retention">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-sm font-black uppercase tracking-tight truncate">
          {contact.full_name ?? 'Unknown Client'}
        </h1>
      </header>

      <div className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-6 pb-24">

        {/* ── Hero Header ─────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-border bg-muted/20 p-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-black shrink-0">
              {contact.full_name?.charAt(0)?.toUpperCase() ?? 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className={`text-[9px] font-black uppercase px-2 border ${RISK_COLORS[contact.risk_level] ?? ''}`}>
                  {contact.risk_level} risk
                </Badge>
                <Badge className={`text-[9px] font-black uppercase px-2 border ${AOR_COLORS[aorStatus]}`}>
                  {aorStatus === 'locked' ? '🔒 Aegis Locked' : aorStatus === 'pending' ? 'AOR Pending' : aorStatus === 'expired' ? 'AOR Expired' : 'Unlocked'}
                </Badge>
                {contact.enrollment_status && (
                  <Badge variant="outline" className="text-[9px] font-black uppercase px-2">
                    {contact.enrollment_status}
                  </Badge>
                )}
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-foreground mb-1">
                {contact.full_name ?? 'Unknown Client'}
              </h2>
              <div className="flex flex-wrap gap-4 mt-3">
                {contact.email && (
                  <a href={`mailto:${contact.email}`}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="w-3.5 h-3.5" /> {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                    <Phone className="w-3.5 h-3.5" /> {contact.phone}
                  </a>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild
                className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-1.5">
                <a href={ghlBaseUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5" /> GHL
                </a>
              </Button>
              <Button size="sm" asChild
                className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-1.5">
                <Link href="/dashboard/scripts">
                  <Megaphone className="w-3.5 h-3.5" /> Script
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Plan Info ────────────────────────────────────────────────── */}
        <Section title="Plan Information" icon={User}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <Field label="Current Plan" value={contact.current_plan_id} />
            <Field label="Risk Score" value={contact.risk_score != null ? `${contact.risk_score}/100` : null} />
            <Field label="Assigned Broker" value={assignedBrokerName} />
            <Field label="Last Checked" value={contact.last_checked_at
              ? new Date(contact.last_checked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : null} />
          </div>
        </Section>

        {/* ── Aegis Lock (AOR) ─────────────────────────────────────────── */}
        {(aorStatus !== 'none' || (aorSubmissions?.length ?? 0) > 0) && (
          <Section title="Aegis Lock — CMS-1696 AOR" icon={Lock}>
            {activeAOR ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <Field label="Status" value={
                    <Badge className={`text-[9px] font-black uppercase px-2 border ${AOR_COLORS[aorStatus]}`}>
                      {aorStatus}
                    </Badge>
                  } />
                  <Field label="Carrier" value={activeAOR.carrier} />
                  <Field label="Signature Method" value={activeAOR.signature_method?.replace(/_/g, ' ') ?? '—'} />
                  <Field label="Client Signed" value={activeAOR.client_signed_at
                    ? new Date(activeAOR.client_signed_at).toLocaleDateString()
                    : '—'} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild
                    className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-1.5">
                    <Link href="/dashboard/aor">
                      <Shield className="w-3.5 h-3.5" /> Manage AOR
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-medium">No active AOR submission.</p>
            )}
          </Section>
        )}

        {/* ── VCC Forms ────────────────────────────────────────────────── */}
        <Section title="VCC Forms" icon={FileCheck}>
          {!vccForms?.length ? (
            <p className="text-sm text-muted-foreground font-medium">No VCC forms on record.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    {['Carrier', 'Status', 'Scheduled Send', 'Submitted'].map(h => (
                      <th key={h} className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vccForms.map(v => (
                    <tr key={v.id} className="border-t border-border/50">
                      <td className="px-3 py-2.5 text-sm font-semibold">{v.carrier}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="text-[9px] font-black uppercase">{v.fax_status}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground font-mono">
                        {v.send_scheduled_at ? new Date(v.send_scheduled_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground font-mono">
                        {new Date(v.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ── Switch Alerts ────────────────────────────────────────────── */}
        <Section title="Switch Alerts" icon={Radar}>
          {!switchAlerts?.length ? (
            <p className="text-sm text-muted-foreground font-medium">No alerts on record.</p>
          ) : (
            <div className="space-y-2">
              {switchAlerts.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-muted/10">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${a.priority === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide truncate">
                      {a.alert_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {a.carrier ?? 'Unknown'} · {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] font-black uppercase shrink-0 ${
                    a.status === 'open' ? 'border-amber-300 text-amber-700' : 'border-emerald-300 text-emerald-700'
                  }`}>
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Active Campaigns ─────────────────────────────────────────── */}
        <Section title="Campaigns" icon={Megaphone}>
          {!campaigns?.length ? (
            <p className="text-sm text-muted-foreground font-medium">Not enrolled in any campaigns.</p>
          ) : (
            <div className="space-y-2">
              {campaigns.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-muted/10">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{
                    backgroundColor: c.status === 'active' ? '#10b981' : c.status === 'completed' ? '#6366f1' : '#94a3b8'
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide truncate">
                      {c.triggered_by?.replace(/_/g, ' ') ?? 'Campaign'}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Enrolled {new Date(c.enrolled_at).toLocaleDateString()}
                      {c.completed_at ? ` · Completed ${new Date(c.completed_at).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-black uppercase shrink-0">{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Timeline ─────────────────────────────────────────────────── */}
        {isStaff && (
          <Section title="Activity Timeline" icon={Clock}>
            {!timeline?.length ? (
              <p className="text-sm text-muted-foreground font-medium">No activity recorded.</p>
            ) : (
              <ol className="relative border-l border-border/50 ml-3 space-y-5">
                {timeline.map(event => (
                  <li key={event.id} className="ml-4">
                    <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-primary/30 border-2 border-primary/60" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs font-bold text-foreground">
                      {event.action.replace(/_/g, ' ')}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        )}
      </div>
    </div>
  )
}
