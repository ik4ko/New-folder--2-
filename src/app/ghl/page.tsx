"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore, initializeStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Link2, RefreshCw, CircleCheck, Webhook, Settings2, Copy, 
  ShieldCheck, Database, Key, Calendar, Smartphone, 
  ChevronRight, Briefcase, ListFilter
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

export default function GHLIntegrationPage() {
  useEffect(() => {
    initializeStore()
  }, [])

  const isGHLConnected = useAppStore(s => s.isGHLConnected)
  const toggleGHL = useAppStore(s => s.toggleGHL)
  const ghlSettings = useAppStore(s => s.ghlSettings)
  const updateGHLSettings = useAppStore(s => s.updateGHLSettings)
  
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)

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
            <h1 className="text-xl font-black text-foreground uppercase tracking-tight">GoHighLevel Integration</h1>
          </div>
          <div className="flex items-center gap-3">
            {isGHLConnected && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 px-3 h-8 font-black uppercase text-[10px]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live: API v2.0
              </Badge>
            )}
            <Button onClick={handleManualSync} disabled={!isGHLConnected || loading} variant="outline" className="rounded-xl h-9 text-xs font-black uppercase tracking-widest border-border">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Manual Resync
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-12 bg-background pb-32">
          {/* Section 1: Connection Status */}
          <section id="connection-status" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-foreground underline decoration-primary/30 underline-offset-4">01. Connection Status</h2>
                <p className="text-xs text-muted-foreground font-black mt-1 uppercase opacity-70">Manage the handshake between your agency CRM and MediStay Intelligence.</p>
              </div>
              <div className="flex items-center gap-3 bg-card p-2 rounded-2xl border border-border shadow-sm px-4">
                <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Live Link</span>
                <Switch checked={isGHLConnected} onCheckedChange={toggleGHL} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="rounded-3xl border border-border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    Authentication Credentials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">API V2 Location Key</Label>
                    <Input 
                      type="password"
                      placeholder="ghl_loc_xxxxxxxxxxxxxxxxxxxx" 
                      className="rounded-xl pl-4 pr-12 font-mono text-xs border-border h-12 bg-background shadow-inner focus-visible:ring-primary font-black text-foreground"
                      value={ghlSettings.apiKey}
                      onChange={(e) => updateGHLSettings({ apiKey: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">Location ID</Label>
                    <Input 
                      placeholder="e.g. zXy992011Lk..." 
                      className="rounded-xl px-4 font-mono text-xs border-border h-12 bg-background shadow-inner font-black text-foreground"
                      value={ghlSettings.locationId}
                      onChange={(e) => updateGHLSettings({ locationId: e.target.value })}
                    />
                  </div>

                  <Button 
                    onClick={handleVerify} 
                    disabled={verifying}
                    className="w-full rounded-xl h-12 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 text-[10px]"
                  >
                    {verifying ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    {isGHLConnected ? "Re-verify Connection" : "Initiate Connection"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-none shadow-sm bg-primary/5 border border-primary/10">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                    <Webhook className="w-4 h-4" />
                    Inbound Webhook Listener
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[11px] text-foreground font-black leading-relaxed uppercase opacity-80">
                    To detect plan changes instantly as they are typed into GHL, create a <strong>GHL Workflow</strong> triggered by 'Contact Changed' and use this URL.
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
          <section id="field-mapping" className="space-y-6">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-foreground underline decoration-primary/30 underline-offset-4">02. CRM Field Mapping</h2>
              <p className="text-xs text-muted-foreground font-black mt-1 uppercase opacity-70">Map MediStay retention logic to your specific GoHighLevel Custom Field keys.</p>
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
