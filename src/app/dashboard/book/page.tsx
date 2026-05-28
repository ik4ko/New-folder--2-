import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users, ShieldCheck, AlertTriangle, CheckCircle2,
  XCircle, ArrowUpRight, ExternalLink, Clock, KeyRound,
} from 'lucide-react'
import Link from 'next/link'
import { RosterUploadPanel } from '@/components/roster-upload-panel'
import { BookMemberTable } from '@/components/book-member-table'
import { MarxStatusBar } from '@/components/marx-status-bar'


export default async function BookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const supabaseAdmin = createServiceClient()

  const [{ data: agency }, { data: brokerRow }] = await Promise.all([
    supabaseAdmin.from('agencies').select('id').eq('owner_id', user.id).maybeSingle(),
    supabaseAdmin.from('brokers').select('id, role, agency_id').eq('user_id', user.id).maybeSingle(),
  ])

  const isPrincipal = ['agency_owner', 'agency_admin'].includes(brokerRow?.role ?? '')
  const isCS        = brokerRow?.role === 'customer_service'
  const isStaff     = isPrincipal || isCS || !!agency
  const agencyId    = agency?.id ?? brokerRow?.agency_id
  if (!agencyId) redirect('/login')

  const [{ data: members }, { data: carrierLogins }, { count: openAlertsCount }] = await Promise.all([
    supabaseAdmin
      .from('book_of_business')
      .select('id, mbi, carrier, carrier_display_name, original_carrier_name, member_id, full_name, plan_name, detected_plan_name, detected_carrier_name, status, verification_status, last_verified_at, first_seen_at, enrollment_status, has_mbi, last_marx_check, future_plan_name, future_effective_date')
      .eq('agency_id', agencyId)
      .order('full_name', { ascending: true, nullsFirst: false })
      .limit(500),
    supabaseAdmin
      .from('carrier_logins')
      .select('carrier, status, last_checked_at')
      .eq('agency_id', agencyId),
    supabaseAdmin
      .from('switch_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('status', 'open'),
  ])

  const memberList    = members ?? []
  const loginList     = carrierLogins ?? []
  const activeCarriers = [...new Set(memberList.map(m => m.carrier))]

  const totalMembers    = memberList.length
  const verifiedCount   = memberList.filter(m => m.enrollment_status === 'active' && m.last_marx_check).length
  const switchingCount  = memberList.filter(m => m.enrollment_status === 'switching').length
  const termedCount     = memberList.filter(m => m.enrollment_status === 'termed' || m.enrollment_status === 'disenrolled').length
  const unverifiedCount = memberList.filter(m => !m.has_mbi || !m.last_marx_check).length
  const missingCount    = memberList.filter(m => m.verification_status === 'missing').length
  const noMbiCount      = memberList.filter(m => !m.mbi).length
  const mbiMemberIds    = memberList.filter(m => m.has_mbi).map(m => m.id)

  const mbiMembers      = memberList.filter(m => m.has_mbi)
  const allVerified     = mbiMembers.length > 0 && mbiMembers.every(m => m.last_marx_check)
  const noAlerts        = (openAlertsCount ?? 0) === 0
  const oneHourAgo      = Date.now() - 60 * 60 * 1000
  const recentlyRun     = memberList.some(m => m.last_marx_check && new Date(m.last_marx_check).getTime() > oneHourAgo)
  const showBaseline    = allVerified && noAlerts && recentlyRun

  const CARRIERS = ['humana', 'uhc', 'aetna', 'bcbs', 'wellcare']
  const carrierStatus = CARRIERS.map(c => {
    const login = loginList.find(l => l.carrier === c || l.carrier.startsWith(`${c}_`))
    return { carrier: c, login: login ?? null }
  })

  const failedCarriers = carrierStatus.filter(c => c.login?.status === 'login_failed')

  // Per-carrier stale sync detection (> 7 days since last sync)
  const CARRIER_PORTAL_URLS: Record<string, string> = {
    clover:      'https://clover.evolvenxt.com/portal/member_search.htm',
    humana:      'https://agentportal.humana.com/Vantage/MyBusiness',
    devoted:     'https://agent.devoted.com/book_of_business_contacts',
    healthfirst: 'https://myhfgroup.org/spa/medicare/#/my-members',
  }
  const CARRIER_LABELS: Record<string, string> = {
    clover: 'Clover Health', humana: 'Humana',
    devoted: 'Devoted Health', healthfirst: 'Health First NY',
    uhc: 'UHC', aetna: 'Aetna', bcbs: 'BCBS', wellcare: 'Wellcare',
  }
  const staleCarriers = activeCarriers
    .map(c => {
      const latest = memberList
        .filter(m => m.carrier === c && m.last_verified_at)
        .reduce<string | null>((max, m) => {
          const ts = m.last_verified_at!
          return !max || ts > max ? ts : max
        }, null)
      if (!latest) return null
      const daysAgo = Math.floor((Date.now() - new Date(latest).getTime()) / 86_400_000)
      if (daysAgo < 7) return null
      return { carrier: c, daysAgo, portalUrl: CARRIER_PORTAL_URLS[c] ?? null }
    })
    .filter(Boolean) as { carrier: string; daysAgo: number; portalUrl: string | null }[]

  const lastCheck = loginList.reduce<string | null>((latest, l) => {
    if (!l.last_checked_at) return latest
    if (!latest) return l.last_checked_at
    return l.last_checked_at > latest ? l.last_checked_at : latest
  }, null)
  const nextCheck = lastCheck
    ? new Date(new Date(lastCheck).getTime() + 72 * 60 * 60 * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'After first connection'

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-tight">Book of Business</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {totalMembers} members · Next check: {nextCheck}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 pb-32">

        {failedCarriers.length > 0 && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-red-400">
                  {failedCarriers.map(c => c.login?.carrier ?? c.carrier).join(', ')} login failed
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Update credentials to resume automatic monitoring</p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline"
              className="rounded-xl font-black uppercase text-[9px] tracking-widest border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0">
              <Link href="/settings/carriers">Fix Now</Link>
            </Button>
          </div>
        )}

        {missingCount > 0 && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-red-400">
                  {missingCount} member{missingCount > 1 ? 's' : ''} missing from roster — may have switched plans
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Act now to retain these clients</p>
              </div>
            </div>
            <Button asChild size="sm"
              className="rounded-xl font-black uppercase text-[9px] tracking-widest bg-red-500 hover:bg-red-600 text-white shrink-0">
              <Link href="/dashboard/churn">View Alerts</Link>
            </Button>
          </div>
        )}

        {staleCarriers.map(({ carrier, daysAgo, portalUrl }) => (
          <div key={carrier} className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-500 shrink-0" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-yellow-400">
                  {CARRIER_LABELS[carrier] ?? carrier}: Last synced {daysAgo}d ago
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Log in and click Sync to check for plan changes
                </p>
              </div>
            </div>
            {portalUrl && (
              <Button asChild size="sm" variant="outline"
                className="rounded-xl font-black uppercase text-[9px] tracking-widest border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 shrink-0 gap-1.5">
                <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3" />Open Portal
                </a>
              </Button>
            )}
          </div>
        ))}

        <RosterUploadPanel
          carriers={loginList.map(l => ({
            carrier: l.carrier,
            lastCheckedAt: l.last_checked_at,
            status: l.status,
          }))}
          activeCarriers={activeCarriers}
        />

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total',       value: totalMembers,    icon: Users,        cls: 'text-slate-400 bg-slate-800' },
            { label: '✓ Verified',  value: verifiedCount,   icon: CheckCircle2, cls: verifiedCount > 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-400 bg-slate-800' },
            { label: '⚠ Switching', value: switchingCount,  icon: AlertTriangle, cls: switchingCount > 0 ? 'text-orange-400 bg-orange-500/10' : 'text-slate-400 bg-slate-800' },
            { label: '✗ Left',      value: termedCount,     icon: XCircle,      cls: termedCount > 0 ? 'text-red-500 bg-red-500/10' : 'text-slate-400 bg-slate-800' },
            { label: 'Unverified',  value: unverifiedCount, icon: ShieldCheck,  cls: 'text-slate-400 bg-slate-800' },
            { label: 'No MBI',      value: noMbiCount,      icon: KeyRound,     cls: noMbiCount > 0 ? 'text-red-400 bg-red-500/10' : 'text-slate-400 bg-slate-800' },
          ].map(({ label, value, icon: Icon, cls }) => (
            <Card key={label} className="rounded-2xl border-slate-800 bg-slate-900/60 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cls}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xl font-black text-white">{value}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* MARx verification status */}
        <MarxStatusBar
          verifiedCount={verifiedCount}
          totalMembers={totalMembers}
          memberIds={mbiMemberIds}
        />

        {/* First-run baseline confirmation */}
        {showBaseline && (
          <div className="px-4 py-3 rounded-lg bg-blue-950 border border-blue-800">
            <p className="text-sm text-blue-300">
              <span className="font-medium text-blue-200">Baseline established.</span>
              {' '}Your first MARx run stored plan baselines for all members.
              Future runs will detect any changes and alert you immediately.
            </p>
          </div>
        )}

        {/* Member table */}
        {memberList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-800 flex items-center justify-center">
              <Users className="w-8 h-8 text-slate-600" />
            </div>
            <div>
              <p className="text-lg font-black uppercase tracking-tight text-white">No Members Yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Sync from a carrier portal with the extension, or upload a roster CSV.
              </p>
            </div>
            <Button asChild size="sm"
              className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 mt-2">
              <Link href="/dashboard/churn/upload">
                <ArrowUpRight className="w-3.5 h-3.5" /> Upload Roster
              </Link>
            </Button>
          </div>
        ) : (
          <BookMemberTable members={memberList} />
        )}
      </div>
    </div>
  )
}
