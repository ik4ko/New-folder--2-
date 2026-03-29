"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Link2, RefreshCw, CircleCheck, History, Database, 
  ArrowRight, Key, Webhook, Zap, Settings2, Copy, 
  ExternalLink, ShieldCheck, CircleAlert, Info,
  Search, ListFilter, PlayCircle, Eye, EyeOff,
  Briefcase, Calendar, Smartphone
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function GHLIntegrationPage() {
  const isGHLConnected = useAppStore(s => s.isGHLConnected)
  const toggleGHL = useAppStore(s => s.toggleGHL)
  const ghlSettings = useAppStore(s => s.ghlSettings)
  const updateGHLSettings = useAppStore(s => s.updateGHLSettings)
  
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const handleManualSync = () => {
    setLoading(true)
    toast({ title: "Connecting GHL API", description: "Fetching updated CRM contact records..." })
    setTimeout(() => {
      setLoading(false)
      toast({ title: "Sync Complete", description: "14 records updated, 2 new members added." })
    }, 2000)
  }

  const handleVerify = () => {
    setVerifying(true)
    setTimeout(() => {
      setVerifying(false)
      if (!isGHLConnected) toggleGHL()
      toast({ title: "API Verified", description: "MediStay successfully connected to your GHL Location." })
    }, 1500)
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
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5 px-3 h-8 font-bold">
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

        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8 bg-slate-50/30 dark:bg-background">
          <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b pb-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    CRM Direct Link 
                    {isGHLConnected && <CircleCheck className="w-5 h-5 text-emerald-500 ml-1" />}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Sync your book of business and push retention alerts directly to GHL pipelines.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-card p-2 rounded-2xl border shadow-sm px-4">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Connection Status</span>
                  <Switch checked={isGHLConnected} onCheckedChange={toggleGHL} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="connection" className="w-full">
                <TabsList className="bg-transparent border-b rounded-none h-12 w-full justify-start px-8 gap-8">
                  <TabsTrigger value="connection" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 font-black text-xs uppercase tracking-widest h-full">
                    Connection
                  </TabsTrigger>
                  <TabsTrigger value="mapping" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 font-black text-xs uppercase tracking-widest h-full">
                    Field Mapping
                  </TabsTrigger>
                  <TabsTrigger value="automations" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 font-black text-xs uppercase tracking-widest h-full">
                    Automations
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="connection" className="p-8 space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="grid gap-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">API V2 Location Key</Label>
                        <div className="relative group">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input 
                            type={showKey ? "text" : "password"}
                            placeholder="ghl_loc_xxxxxxxxxxxxxxxxxxxx" 
                            className="rounded-xl pl-11 pr-12 font-mono text-xs border-primary/20 h-12 bg-white dark:bg-background shadow-inner focus-visible:ring-primary"
                            value={ghlSettings.apiKey || (isGHLConnected ? "pit_live_key_managed_by_medistay" : "")}
                            onChange={(e) => updateGHLSettings({ apiKey: e.target.value })}
                          />
                          <button 
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[10px] text-muted-foreground italic">Found in GHL Settings {' > '} Business Profile {' > '} API Key</p>
                          <Button variant="link" className="h-auto p-0 text-[10px] font-bold">Where is this?</Button>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location ID</Label>
                        <Input 
                          placeholder="e.g. zXy992011Lk..." 
                          className="rounded-xl px-4 font-mono text-xs border-primary/20 h-12 bg-white dark:bg-background shadow-inner"
                          value={ghlSettings.locationId}
                          onChange={(e) => updateGHLSettings({ locationId: e.target.value })}
                        />
                      </div>

                      <Button 
                        onClick={handleVerify} 
                        disabled={verifying}
                        className="w-full rounded-xl h-12 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                      >
                        {verifying ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                        {isGHLConnected ? "Update & Re-verify" : "Connect GoHighLevel"}
                      </Button>
                    </div>

                    <div className="space-y-6">
                      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Info className="w-4 h-4 text-primary" />
                          Real-time Inbound Sync
                        </h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          To detect changes as they happen in your CRM, create a <strong>GHL Workflow</strong> with a <strong>'Webhook'</strong> action and paste your secret URL below.
                        </p>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Webhook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              readOnly 
                              value={ghlSettings.webhookUrl} 
                              className="rounded-xl pl-11 font-mono text-[9px] bg-muted h-10 border-none shadow-inner text-muted-foreground"
                            />
                          </div>
                          <Button variant="outline" className="rounded-xl h-10 w-10 p-0 border-primary/20 bg-white" onClick={() => copyToClipboard(ghlSettings.webhookUrl)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                          <CircleCheck className="w-3.5 h-3.5" />
                          MediStay Webhook Listener is Active
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="mapping" className="p-8 space-y-8 animate-in fade-in duration-300">
                  <div className="bg-primary/5 rounded-2xl border border-primary/10 p-5 flex gap-5 items-center">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border shadow-sm shrink-0 text-primary">
                      <Settings2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">Production Field Mapping</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        MediStay maps these keys to your GHL <strong>Custom Field Keys</strong>. Ensure these match exactly (e.g. <code>contact.medicare_mbi</code>) for accurate monitoring.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
                    {[
                      { label: "Medicare ID (MBI)", key: "medicareId", icon: Key, placeholder: "e.g. contact.medicare_id" },
                      { label: "Current Carrier", key: "carrier", icon: Database, placeholder: "e.g. contact.carrier" },
                      { label: "Active Plan Name", key: "planName", icon: Briefcase, placeholder: "e.g. contact.plan_name" },
                      { label: "Enrollment Period", key: "enrollmentPeriod", icon: ListFilter, placeholder: "e.g. contact.enrollment_type" },
                      { label: "Part A Effective Date", key: "partAEffective", icon: Calendar, placeholder: "e.g. contact.part_a_date" },
                      { label: "Part B Effective Date", key: "partBEffective", icon: Calendar, placeholder: "e.g. contact.part_b_date" },
                      { label: "Physician Name (PCP)", key: "pcpName", icon: Smartphone, placeholder: "e.g. contact.pcp_name" }
                    ].map((field) => (
                      <div key={field.key} className="flex flex-col gap-2.5">
                        <div className="flex justify-between items-center px-1">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <field.icon className="w-3 h-3" />
                            {field.label}
                          </Label>
                          <span className="text-[9px] font-bold text-primary italic">Required</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Input 
                            placeholder={field.placeholder}
                            className="rounded-xl text-xs h-11 bg-white shadow-sm border-primary/10 font-mono focus-visible:ring-primary"
                            value={ghlSettings.fieldMapping[field.key as keyof typeof ghlSettings.fieldMapping]}
                            onChange={(e) => {
                              const newMapping = { ...ghlSettings.fieldMapping, [field.key]: e.target.value };
                              updateGHLSettings({ fieldMapping: newMapping });
                            }}
                          />
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center border shadow-sm shrink-0">
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="automations" className="p-8 space-y-10 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="rounded-3xl border bg-card dark:bg-slate-900 shadow-sm relative group overflow-hidden flex flex-col">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Zap className="w-20 h-20 text-primary" />
                      </div>
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                              <Zap className="w-4 h-4 text-primary" />
                              Retention Alert Flow
                            </CardTitle>
                            <CardDescription className="text-[10px]">Triggered on plan switch detection</CardDescription>
                          </div>
                          <Switch checked={ghlSettings.automationEnabled} onCheckedChange={(val) => updateGHLSettings({ automationEnabled: val })} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 flex-1">
                        <div className="space-y-3">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Pipeline Mapping</Label>
                          <Select value={ghlSettings.pipelineId} onValueChange={(val) => updateGHLSettings({ pipelineId: val })}>
                            <SelectTrigger className="rounded-xl h-10 text-xs bg-muted/50 border-none shadow-inner">
                              <SelectValue placeholder="Select Pipeline" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PL_99201">Medicare Retention</SelectItem>
                              <SelectItem value="PL_MAIN">Main Sales Pipeline</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Alert Stage</Label>
                          <Select value={ghlSettings.stageId} onValueChange={(val) => updateGHLSettings({ stageId: val })}>
                            <SelectTrigger className="rounded-xl h-10 text-xs bg-muted/50 border-none shadow-inner">
                              <SelectValue placeholder="Select Stage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ST_CHURN_ALERT">Churn Alert (High Risk)</SelectItem>
                              <SelectItem value="ST_REVIEW">Policy Review</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-3xl border bg-card dark:bg-slate-900 shadow-sm relative group overflow-hidden flex flex-col">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <PlayCircle className="w-20 h-20 text-emerald-500" />
                      </div>
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                              <PlayCircle className="w-4 h-4 text-emerald-500" />
                              Enrollment Sync
                            </CardTitle>
                            <CardDescription className="text-[10px]">Data enrichment push</CardDescription>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 flex-1">
                        <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                          Automatically push Medicare Part A/B effective dates and SSBCI verification status back to GHL contact custom fields after MediStay OCR processing.
                        </p>
                        <div className="pt-2">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Applied Tags</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-100 font-bold uppercase">medistay-verified</Badge>
                            <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-100 font-bold uppercase">phi-updated</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-3xl border bg-card dark:bg-slate-900 shadow-sm relative group overflow-hidden flex flex-col">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <CircleAlert className="w-20 h-20 text-primary" />
                      </div>
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                              <CircleAlert className="w-4 h-4 text-primary" />
                              AEP Shield Integration
                            </CardTitle>
                            <CardDescription className="text-[10px]">September loyalty flow</CardDescription>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 flex-1">
                        <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                          When Module 5 triggers AEP Shield, automatically send a text via your GHL Number and move contact to 'Loyalty Campaign' pipeline.
                        </p>
                        <div className="space-y-3 pt-2">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Alert Tag in GHL</Label>
                          <Input 
                            value={ghlSettings.riskTag} 
                            onChange={(e) => updateGHLSettings({ riskTag: e.target.value })}
                            className="h-9 rounded-xl text-[10px] bg-muted/50 border-none shadow-inner font-mono"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="p-6 rounded-3xl bg-slate-900 text-white relative overflow-hidden shadow-xl">
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary backdrop-blur-md border border-white/10">
                        <Settings2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-white">Advanced Sync Protocols</h4>
                        <p className="text-[10px] text-slate-400">Manage polling frequency and system collision logic.</p>
                      </div>
                      <div className="ml-auto flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[9px] font-bold uppercase text-slate-500 mb-1 tracking-widest">Frequency</p>
                          <Select value={ghlSettings.syncFrequency} onValueChange={(val: any) => updateGHLSettings({ syncFrequency: val })}>
                            <SelectTrigger className="h-8 w-32 rounded-lg bg-slate-800 border-slate-700 text-[10px] font-bold">
                              <SelectValue placeholder="Frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Every Hour</SelectItem>
                              <SelectItem value="daily">Every Morning</SelectItem>
                              <SelectItem value="manual">Manual Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button variant="outline" className="h-10 rounded-xl border-slate-700 bg-transparent text-xs hover:bg-slate-800 text-white font-bold">
                          <PlayCircle className="w-4 h-4 mr-2" /> Test Inbound
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-sm font-bold uppercase tracking-widest">HIPAA Compliant Sync</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                MediStay matches contacts using <strong>Medicare ID</strong> and <strong>Email</strong>. PHI data is encrypted during transit via TLS 1.3 and handled exclusively within the scope of our signed BAA.
              </p>
            </div>
            <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <CircleAlert className="w-4 h-4" />
                <span className="text-sm font-bold uppercase tracking-widest">Conflict Protocol</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                If CRM data conflicts with official CMS snapshots, MediStay marks the record as <strong>Needs Verification</strong> and prioritizes the CMS MARx source.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Sync Audit Logs
              </h3>
              <Button variant="ghost" size="sm" className="text-[10px] font-bold text-primary uppercase hover:bg-primary/5 tracking-widest">Clear Logs</Button>
            </div>
            <div className="rounded-2xl border border-border bg-card divide-y overflow-hidden shadow-sm">
              {[
                { time: "2h ago", event: "GHL Webhook Inbound", detail: "Robert Miller updated contact info (Custom Field: medicare_mbi)", status: "Success", type: 'sync' },
                { time: "5h ago", event: "Daily Automated Pull", detail: "1,422 members scanned, 0 changes detected in GHL source", status: "Success", type: 'poll' },
                { time: "1d ago", event: "Manual Sync Triggered", detail: "Sync initiated by Agent JD (Full Book Refresh)", status: "Success", type: 'manual' },
                { time: "2d ago", event: "Mapping Conflict Detected", detail: "MBI mismatch detected for Alice Johnson (GHL value ignored)", status: "Resolved", type: 'conflict' },
              ].map((log, i) => (
                <div key={i} className="p-4 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${
                      log.type === 'sync' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      log.type === 'poll' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                      log.type === 'manual' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                      'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {log.type === 'sync' ? <Webhook className="w-4 h-4" /> :
                       log.type === 'poll' ? <Database className="w-4 h-4" /> :
                       log.type === 'manual' ? <RefreshCw className="w-4 h-4" /> :
                       <CircleAlert className="w-4 h-4" />}
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
  )
}