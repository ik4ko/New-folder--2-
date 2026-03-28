"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Link2, RefreshCw, CheckCircle2, History, Database, 
  ArrowRight, Key, Webhook, Zap, Settings2, Copy, 
  ExternalLink, ShieldCheck, AlertCircle
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function GHLIntegrationPage() {
  const isGHLConnected = useAppStore(s => s.isGHLConnected)
  const toggleGHL = useAppStore(s => s.toggleGHL)
  const ghlSettings = useAppStore(s => s.ghlSettings)
  const updateGHLSettings = useAppStore(s => s.updateGHLSettings)
  const [loading, setLoading] = useState(false)

  const handleManualSync = () => {
    setLoading(true)
    toast({ title: "Connecting GHL API", description: "Fetching updated CRM contact records..." })
    setTimeout(() => {
      setLoading(false)
      toast({ title: "Sync Complete", description: "14 records updated, 2 new members added." })
    }, 2000)
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
            <Link2 className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">GoHighLevel Integration</h1>
          </div>
          <div className="flex items-center gap-3">
            {isGHLConnected && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5 px-3 h-8">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live: API v2.0
              </Badge>
            )}
            {isGHLConnected && (
              <Button onClick={handleManualSync} disabled={loading} variant="outline" className="rounded-xl h-9 text-xs font-bold">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Manual Resync
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8">
          <div className="flex flex-col gap-6">
            <Card className="rounded-3xl border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b pb-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      CRM Direct Link 
                      {isGHLConnected && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Sync your book of business from GoHighLevel contacts and push retention alerts.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 bg-white dark:bg-card p-2 rounded-2xl border shadow-sm px-4">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Connection Status</span>
                    <Switch checked={isGHLConnected} onCheckedChange={toggleGHL} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="connection" className="w-full">
                  <TabsList className="bg-transparent border-b rounded-none h-12 w-full justify-start px-8 gap-8">
                    <TabsTrigger value="connection" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 font-bold text-xs uppercase tracking-widest h-full">
                      Connection
                    </TabsTrigger>
                    <TabsTrigger value="mapping" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 font-bold text-xs uppercase tracking-widest h-full">
                      Field Mapping
                    </TabsTrigger>
                    <TabsTrigger value="automations" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 font-bold text-xs uppercase tracking-widest h-full">
                      Automations
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="connection" className="p-8 space-y-6 animate-in fade-in duration-300">
                    <div className="grid gap-6">
                      <div className="grid gap-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">API V2 Location Key</Label>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            type="password" 
                            placeholder="ghl_loc_xxxxxxxxxxxxxxxxxxxx" 
                            className="rounded-xl pl-11 font-mono text-xs border-primary/20 h-12 bg-white dark:bg-background shadow-inner"
                            value={isGHLConnected ? "••••••••••••••••••••••••" : ""}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground px-1">Found in GHL Settings &gt; Business Profile &gt; API Key</p>
                      </div>

                      <div className="grid gap-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Inbound Webhook Secret</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Webhook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              readOnly 
                              value={ghlSettings.webhookUrl} 
                              className="rounded-xl pl-11 font-mono text-xs bg-muted h-12 border-none shadow-inner"
                            />
                          </div>
                          <Button variant="outline" className="rounded-xl h-12 w-12 p-0 border-primary/20 bg-white" onClick={() => copyToClipboard(ghlSettings.webhookUrl)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground px-1 italic">Create a Workflow in GHL using 'Webhook' action and paste this URL to sync real-time contact updates.</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="mapping" className="p-8 space-y-6 animate-in fade-in duration-300">
                    <div className="bg-primary/5 rounded-2xl border border-primary/10 p-4 mb-6 flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border shadow-sm shrink-0">
                        <Settings2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">Custom Field Synchronization</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          MediStay needs to know which fields in your GHL contacts store Medicare-specific data. 
                          Select the internal keys for your custom fields below.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                      {[
                        { label: "Medicare ID (MBI)", key: "medicareId" },
                        { label: "Current Carrier", key: "carrier" },
                        { label: "Plan Name", key: "planName" },
                        { label: "Enrollment Period", key: "enrollmentPeriod" }
                      ].map((field) => (
                        <div key={field.key} className="flex flex-col gap-2">
                          <div className="flex justify-between items-center px-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{field.label}</Label>
                            <span className="text-[9px] font-bold text-primary italic">MediStay Map</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Input 
                              placeholder="e.g. {{contact.medicare_mbi}}" 
                              className="rounded-xl text-xs h-10 bg-white shadow-sm border-primary/10"
                              value={ghlSettings.fieldMapping[field.key as keyof typeof ghlSettings.fieldMapping]}
                              onChange={(e) => {
                                const newMapping = { ...ghlSettings.fieldMapping, [field.key]: e.target.value };
                                updateGHLSettings({ fieldMapping: newMapping });
                              }}
                            />
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border shadow-sm">
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="automations" className="p-8 space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="rounded-2xl border bg-white dark:bg-slate-900 shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Zap className="w-16 h-16 text-primary" />
                        </div>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                              <Zap className="w-4 h-4 text-primary" />
                              Retention Alert Flow
                            </CardTitle>
                            <Switch checked={ghlSettings.automationEnabled} />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Automatically push a tag and move contact to 'Retention Alert' pipeline in GHL when Module 1 detects a switch.
                          </p>
                          <Button variant="link" className="p-0 h-auto text-[10px] font-bold text-primary group-hover:underline">Configure Pipeline Mapping <ExternalLink className="w-3 h-3 ml-1 inline" /></Button>
                        </CardContent>
                      </Card>

                      <Card className="rounded-2xl border bg-white dark:bg-slate-900 shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Database className="w-16 h-16 text-emerald-500" />
                        </div>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                              <Database className="w-4 h-4 text-emerald-500" />
                              Data Enrichment
                            </CardTitle>
                            <Switch defaultChecked />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Push Medicare Part A/B dates and SSBCI status back to GHL contact custom fields after OCR extraction.
                          </p>
                          <Button variant="link" className="p-0 h-auto text-[10px] font-bold text-emerald-600 group-hover:underline">Manage Enrichment Tags <ExternalLink className="w-3 h-3 ml-1 inline" /></Button>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-sm font-bold">HIPAA Compliant Sync</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  MediStay matched contacts using <strong>Medicare ID</strong> and <strong>Email</strong>. PHI data is encrypted during transit via TLS 1.3. 
                  BAA coverage extends to all API data processing.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-bold">Conflict Resolution</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  If GHL data conflicts with official CMS snapshots, MediStay marks the record as <strong>Needs Verification</strong> and prioritizes the CMS source.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <History className="w-4 h-4 text-muted-foreground" />
                  Recent Data Sync Events
                </h3>
                <Button variant="ghost" size="sm" className="text-[10px] font-bold text-primary uppercase">Clear Logs</Button>
              </div>
              <div className="rounded-2xl border border-border bg-card divide-y overflow-hidden shadow-sm">
                {[
                  { time: "2h ago", event: "GHL Webhook Inbound", detail: "Robert Miller updated contact info", status: "Success", type: 'sync' },
                  { time: "5h ago", event: "Daily Automated Pull", detail: "1,422 members scanned, 0 changes", status: "Success", type: 'poll' },
                  { time: "1d ago", event: "Manual Sync Triggered", detail: "Initiated by Agent JD", status: "Success", type: 'manual' },
                  { time: "2d ago", event: "Webhook Conflict", detail: "MBI mismatch detected for Alice Johnson", status: "Resolved", type: 'conflict' },
                ].map((log, i) => (
                  <div key={i} className="p-4 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm ${
                        log.type === 'sync' ? 'bg-blue-50 text-blue-600' :
                        log.type === 'poll' ? 'bg-purple-50 text-purple-600' :
                        log.type === 'manual' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {log.type === 'sync' ? <RefreshCw className="w-4 h-4" /> :
                         log.type === 'poll' ? <Database className="w-4 h-4" /> :
                         log.type === 'manual' ? <RefreshCw className="w-4 h-4" /> :
                         <AlertCircle className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-foreground">{log.event}</p>
                        <p className="text-muted-foreground font-medium text-[10px]">{log.detail}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-mono text-[10px] text-muted-foreground">{log.time}</p>
                      <span className={`text-[9px] font-black uppercase ${
                        log.status === 'Success' ? 'text-emerald-600' : 'text-primary'
                      }`}>{log.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
