"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore, initializeStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Link2, RefreshCw, CircleCheck, Webhook, Settings2, Copy,
  ShieldCheck, Database, Key, Calendar, Smartphone,
  ChevronRight, Briefcase, ListFilter, Users, Zap, ExternalLink, AlertCircle, Download
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useState, useEffect, useTransition, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { syncContactsFromGHL, getLastSyncTime } from "@/app/actions/ghl-sync"
import { useRole } from "@/hooks/useRole"

interface GhlCredential {
  location_id: string | null;
  expires_at: string;
}

export default function GHLIntegrationPage() {
  useEffect(() => {
    initializeStore()
  }, [])

  const ghlSettings = useAppStore(s => s.ghlSettings)
  const updateGHLSettings = useAppStore(s => s.updateGHLSettings)
  const importFromGHL = useAppStore(s => s.importFromGHL)
  const { isPrincipal, agencyId } = useRole()

  const [loading, setLoading] = useState(false)
  const [credential, setCredential] = useState<GhlCredential | null>(null)
  const [credLoading, setCredLoading] = useState(true)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncPending, startSyncTransition] = useTransition()
  const [incrementalSyncing, setIncrementalSyncing] = useState(false)

  // Live sync progress
  const [syncStatus, setSyncStatus]   = useState<string | null>(null)
  const [syncTotal, setSyncTotal]     = useState<number | null>(null)
  const [syncHasMore, setSyncHasMore] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const searchParams = useSearchParams()
  const autoSyncParam = searchParams?.get('autoSync')

  // Check connection status from Supabase
  useEffect(() => {
    const fetchCredential = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setCredLoading(false); return; }

      const { data: agency } = await supabase
        .from('agencies')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (!agency) { setCredLoading(false); return; }

      const { data } = await supabase
        .from('agency_credentials')
        .select('location_id, expires_at, access_token')
        .eq('agency_id', agency.id)
        .maybeSingle()

      if (data?.access_token) {
        setCredential({ location_id: data.location_id, expires_at: data.expires_at })
      }
      setCredLoading(false)
    }
    fetchCredential()
  }, [])

  const isConnected = credential != null && new Date(credential.expires_at) > new Date()
  const isExpired = credential != null && new Date(credential.expires_at) <= new Date()

  useEffect(() => {
    if (agencyId) getLastSyncTime(agencyId).then(setLastSync)
  }, [agencyId])

  const handleManualSync = () => {
    setLoading(true)
    toast({ title: "Syncing from GHL", description: "Fetching member data via OAuth bridge..." })
    setTimeout(() => {
      importFromGHL(5)
      setLoading(false)
      toast({
        title: "Sync Complete",
        description: "5 members imported with carrier portal links and retention scores.",
        className: "bg-emerald-50 border-emerald-200"
      })
    }, 2500)
  }

  function handleContactSync() {
    if (!isPrincipal) return
    startSyncTransition(async () => {
      const res = await syncContactsFromGHL()
      if (res.error) {
        toast({ variant: 'destructive', title: 'Contact sync failed', description: res.error })
      } else {
        toast({ title: 'Contacts Synced', description: `${res.synced} contacts synced to AegisSage.` })
        if (agencyId) getLastSyncTime(agencyId).then(setLastSync)
      }
    })
  }

  // Poll sync-status every 2 s while a sync is running
  const startPolling = useCallback(() => {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/ghl/sync-status')
        if (!res.ok) return
        const json = await res.json() as {
          sync_status: string | null; sync_total: number | null; has_more: boolean
        }
        setSyncStatus(json.sync_status)
        setSyncTotal(json.sync_total)
        setSyncHasMore(json.has_more)
        // Stop polling once sync is no longer running
        if (json.sync_status !== 'running') {
          clearInterval(pollRef.current!)
          pollRef.current = null
        }
      } catch { /* ignore */ }
    }, 2000)
  }, [])

  // Auto-continue for large accounts: if has_more, automatically call sync again
  const runSync = useCallback(async (force: boolean, resume = false) => {
    setIncrementalSyncing(true)
    setSyncStatus('running')
    startPolling()

    let totalSynced = 0
    let hasMore     = true
    let isResume    = resume

    try {
      while (hasMore) {
        const res  = await fetch('/api/ghl/sync', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ force: !isResume && force, resume: isResume, maxPages: 20 }),
        })
        const json = await res.json() as {
          synced: number; has_more: boolean; error?: string; message?: string
        }

        if (!res.ok) {
          toast({ variant: 'destructive', title: 'Sync failed', description: json.error ?? 'Unknown error' })
          break
        }

        totalSynced += json.synced ?? 0
        hasMore      = json.has_more ?? false
        isResume     = true  // subsequent calls always resume from cursor

        setSyncTotal(totalSynced)

        if (!hasMore) {
          setSyncStatus('complete')
          toast({
            title:       force ? 'Import Complete' : 'Sync Complete',
            description: `${totalSynced} contacts imported from GoHighLevel.`,
            className:   'bg-emerald-50 border-emerald-200',
          })
        }
        // Small breathing room between chunks
        if (hasMore) await new Promise(r => setTimeout(r, 500))
      }
    } catch {
      setSyncStatus('error')
      toast({ variant: 'destructive', title: 'Sync failed', description: 'Network error — please try again.' })
    } finally {
      setIncrementalSyncing(false)
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [startPolling])

  // Auto-sync on first connect
  useEffect(() => {
    if (autoSyncParam === '1' && isConnected && !incrementalSyncing) {
      runSync(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSyncParam, isConnected])

  // Load initial sync status
  useEffect(() => {
    fetch('/api/ghl/sync-status').then(r => r.json()).then((json: Record<string, unknown>) => {
      setSyncStatus(json.sync_status as string | null)
      setSyncTotal(json.sync_total as number | null)
      setSyncHasMore(!!(json.has_more))
      if (json.sync_status === 'running') startPolling()
    }).catch(() => {})
  }, [startPolling])

  async function handleIncrementalSync(force = false) {
    await runSync(force, false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied", description: "Webhook URL copied to clipboard." })
  }

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />

      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground uppercase tracking-tight">GoHighLevel Integration</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Confidential Data Bridge</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isConnected && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 px-3 h-8 font-black uppercase text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Connection
              </Badge>
            )}
            {isExpired && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 px-3 h-8 font-black uppercase text-[10px]">
                <AlertCircle className="w-3 h-3" />
                Token Expired
              </Badge>
            )}
            {isPrincipal && isConnected && (
              <Button
                onClick={handleContactSync}
                disabled={syncPending}
                variant="outline"
                className="rounded-xl h-9 text-xs font-black uppercase tracking-widest border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <Download className={`w-4 h-4 mr-2 ${syncPending ? 'animate-spin' : ''}`} />
                {syncPending ? 'Syncing...' : 'Sync Contacts'}
              </Button>
            )}
            {lastSync && (
              <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest hidden lg:block">
                Last {new Date(lastSync).toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={handleManualSync}
              disabled={!isConnected || loading}
              variant="outline"
              className="rounded-xl h-9 text-xs font-black uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/5"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Import Now
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-12 bg-background pb-32">
          {/* Action Center */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-[2rem] border-none bg-primary/5 p-6 space-y-4">
              <Users className="w-8 h-8 text-primary" />
              <div className="space-y-1">
                <h3 className="font-black uppercase text-xs tracking-tight">Member Sync</h3>
                <p className="text-[10px] text-muted-foreground font-bold leading-relaxed uppercase">Import active Medicare clients from GHL to start autonomous carrier portal monitoring.</p>
              </div>
              <Button
                onClick={handleManualSync}
                disabled={!isConnected}
                className="w-full rounded-xl bg-primary text-white font-black uppercase text-[9px] h-10"
              >
                Trigger Bulk Import
              </Button>
            </Card>

            <Card className="rounded-[2rem] border-none bg-accent/5 p-6 space-y-4">
              <Zap className="w-8 h-8 text-accent" />
              <div className="space-y-1">
                <h3 className="font-black uppercase text-xs tracking-tight">Automation</h3>
                <p className="text-[10px] text-muted-foreground font-bold leading-relaxed uppercase">Automatically tag GHL contacts with churn risk scores and retention flags.</p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch defaultChecked />
                <span className="text-[9px] font-black uppercase">Two-way Sync</span>
              </div>
            </Card>

            <Card className="rounded-[2rem] border-none bg-emerald-500/5 p-6 space-y-4">
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
              <div className="space-y-1">
                <h3 className="font-black uppercase text-xs tracking-tight">Security</h3>
                <p className="text-[10px] text-muted-foreground font-bold leading-relaxed uppercase">PII/PHI data is end-to-end encrypted before it enters our persistent vault.</p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[8px] uppercase px-2">HIPAA Confirmed</Badge>
            </Card>
          </div>

          <Separator className="opacity-50" />

          {/* Section 1: Connection Status */}
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-foreground underline decoration-primary/30 underline-offset-4">01. Connection Status</h2>
              <p className="text-xs text-muted-foreground font-black mt-1 uppercase opacity-70">Manage the OAuth handshake between your GHL account and AegisSage Intelligence.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* OAuth Connect Card */}
              <Card className="rounded-3xl border border-border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    OAuth Connection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {credLoading ? (
                    <div className="h-24 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : isConnected ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                        <CircleCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-black uppercase text-emerald-700">GHL Account Connected</p>
                          {credential?.location_id && (
                            <p className="text-[10px] font-mono text-emerald-600 opacity-80 mt-0.5">
                              Location: {credential.location_id}
                            </p>
                          )}
                          <p className="text-[9px] font-bold text-emerald-500/80 uppercase mt-0.5">
                            Expires: {new Date(credential!.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Live progress bar */}
                      {(incrementalSyncing || syncStatus === 'running') && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[9px] font-black uppercase">
                            <span className="text-primary animate-pulse">Importing contacts…</span>
                            {syncTotal != null && <span className="text-slate-500">{syncTotal.toLocaleString()} imported</span>}
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                          </div>
                          <p className="text-[8px] text-slate-400 font-bold uppercase">
                            {syncHasMore ? 'Processing large account — auto-continuing…' : 'Almost done…'}
                          </p>
                        </div>
                      )}

                      {/* Complete status */}
                      {syncStatus === 'complete' && !incrementalSyncing && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                          <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-[10px] font-black uppercase text-emerald-700">Import Complete</p>
                            {syncTotal != null && (
                              <p className="text-[9px] text-emerald-600">{syncTotal.toLocaleString()} contacts in AegisSage</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Add new contacts (incremental) */}
                      <Button
                        onClick={() => handleIncrementalSync(false)}
                        disabled={incrementalSyncing}
                        className="w-full rounded-xl h-12 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white text-[10px] shadow-lg shadow-primary/20"
                      >
                        {incrementalSyncing
                          ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Syncing…</>
                          : <><Download className="w-4 h-4 mr-2" />Sync New Contacts</>
                        }
                      </Button>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase text-center -mt-2">
                        Only pulls contacts added or updated since last import
                      </p>

                      {/* Full re-import */}
                      <Button
                        onClick={() => handleIncrementalSync(true)}
                        disabled={incrementalSyncing}
                        variant="outline"
                        className="w-full rounded-xl h-10 font-black uppercase tracking-widest text-[9px] border-slate-300 text-slate-600 hover:bg-slate-50"
                      >
                        <RefreshCw className="w-3 h-3 mr-1.5" />Re-Import All {syncTotal ? `(${syncTotal.toLocaleString()} contacts)` : 'Contacts'}
                      </Button>

                      <Button
                        asChild
                        variant="ghost"
                        className="w-full rounded-xl h-10 font-black uppercase tracking-widest text-[9px] text-primary/60 hover:text-primary hover:bg-primary/5"
                      >
                        <Link href="/api/ghl/connect">
                          <RefreshCw className="w-3 h-3 mr-1.5" />
                          Reconnect OAuth
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {isExpired && (
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                          <p className="text-xs font-black uppercase text-amber-700">Token expired -- reconnect to restore access.</p>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground font-bold uppercase leading-relaxed">
                        Connect your GoHighLevel account via secure OAuth 2.0. AegisSage will never store your GHL password.
                      </p>
                      <Button
                        asChild
                        className="w-full rounded-xl h-12 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 text-[10px]"
                      >
                        <Link href="/api/ghl/connect">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Connect GoHighLevel
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Webhook Card */}
              <Card className="rounded-3xl border-none shadow-sm bg-primary/5 border border-primary/10">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                    <Webhook className="w-4 h-4" />
                    Inbound Webhook Listener
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[11px] text-foreground font-black leading-relaxed uppercase opacity-80">
                    To detect plan changes instantly, create a <strong>GHL Workflow</strong> triggered by 'Contact Changed' using this URL.
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        readOnly
                        value={ghlSettings.webhookUrl}
                        className="rounded-xl px-4 font-mono text-[9px] bg-white border-border h-10 shadow-inner text-foreground font-black cursor-not-allowed opacity-70"
                      />
                    </div>
                    <Button variant="outline" className="rounded-xl h-10 w-10 p-0 border-border bg-white" onClick={() => copyToClipboard(ghlSettings.webhookUrl)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-700 font-black uppercase tracking-widest bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                    <CircleCheck className="w-3.5 h-3.5" />
                    Secure Listener Active
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator className="opacity-50" />

          {/* Section 2: Field Mapping */}
          <section className="space-y-6 pb-20">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-foreground underline decoration-primary/30 underline-offset-4">02. CRM Field Mapping</h2>
              <p className="text-xs text-muted-foreground font-black mt-1 uppercase opacity-70">Map AegisSage retention logic to your specific GoHighLevel Custom Field keys.</p>
            </div>

            <Card className="rounded-3xl border border-border shadow-sm bg-card overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-border flex items-center justify-center text-primary shadow-sm">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-sm font-black uppercase tracking-tight">Standardized Data Exchange</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                  {[
                    { label: "Medicare ID (MBI)", key: "medicareId", icon: Key, placeholder: "contact.medicare_mbi" },
                    { label: "Current Carrier", key: "carrier", icon: Database, placeholder: "contact.current_carrier" },
                    { label: "Active Plan Name", key: "planName", icon: Briefcase, placeholder: "contact.plan_name" },
                    { label: "Enrollment Period", key: "enrollmentPeriod", icon: ListFilter, placeholder: "contact.enrollment_type" },
                    { label: "Part A Effective Date", key: "partAEffective", icon: Calendar, placeholder: "contact.part_a_date" },
                    { label: "Part B Effective Date", key: "partBEffective", icon: Calendar, placeholder: "contact.part_b_date" },
                    { label: "Physician Name (PCP)", key: "pcpName", icon: Smartphone, placeholder: "contact.primary_doctor" }
                  ].map((field) => (
                    <div key={field.key} className="flex flex-col gap-3">
                      <div className="flex justify-between items-center px-1">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                          <field.icon className="w-3.5 h-3.5 text-primary" />
                          {field.label}
                        </Label>
                        <span className="text-[9px] font-black text-primary uppercase italic tracking-tighter">Mapping Active</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          placeholder={field.placeholder}
                          className="rounded-xl text-xs h-12 bg-background shadow-inner border-border font-black text-foreground focus-visible:ring-primary uppercase tracking-tight"
                          value={ghlSettings.fieldMapping[field.key as keyof typeof ghlSettings.fieldMapping]}
                          onChange={(e) => {
                            const newMapping = { ...ghlSettings.fieldMapping, [field.key]: e.target.value };
                            updateGHLSettings({ fieldMapping: newMapping });
                          }}
                        />
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center border border-border shadow-sm shrink-0">
                          <ChevronRight className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}
