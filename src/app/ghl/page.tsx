
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link2, RefreshCw, CheckCircle2, History, Database, ArrowRight } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"

export default function GHLIntegrationPage() {
  const isGHLConnected = useAppStore(s => s.isGHLConnected)
  const toggleGHL = useAppStore(s => s.toggleGHL)
  const [loading, setLoading] = useState(false)

  const handleManualSync = () => {
    setLoading(true)
    toast({ title: "Connecting GHL API", description: "Fetching updated CRM contact records..." })
    setTimeout(() => {
      setLoading(false)
      toast({ title: "Sync Complete", description: "14 records updated, 2 new members added." })
    }, 2000)
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
          {isGHLConnected && (
            <Button onClick={handleManualSync} disabled={loading} variant="outline" className="rounded-xl h-9 text-xs font-bold">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Manual Resync
            </Button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-8">
          <div className="p-8 rounded-3xl bg-card border shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  CRM Direct Link 
                  {isGHLConnected && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </h2>
                <p className="text-xs text-muted-foreground">Pull member roster and push retention alerts directly to GHL Pipelines.</p>
              </div>
              <div className="flex items-center gap-3 bg-muted p-2 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-muted-foreground px-2">Enabled</span>
                <Switch checked={isGHLConnected} onCheckedChange={toggleGHL} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-xs uppercase tracking-widest font-black text-muted-foreground ml-1">API Location Key</Label>
                <Input 
                  type="password" 
                  placeholder="ghl_loc_xxxxxxxxxxxxxxxxxxxx" 
                  className="rounded-xl font-mono text-xs border-primary/20 h-11"
                  value={isGHLConnected ? "••••••••••••••••••••••••" : ""}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs uppercase tracking-widest font-black text-muted-foreground ml-1">Webhook Secret (Inbound)</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value="https://api.medistay.io/v1/webhooks/ghl/12345" 
                    className="rounded-xl font-mono text-xs bg-muted h-11"
                  />
                  <Button variant="outline" className="rounded-xl h-11 text-xs">Copy</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <Database className="w-4 h-4" />
                <span className="text-sm font-bold">Contact Matching</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                MediStay matches GHL contacts using <strong>Medicare ID</strong> and <strong>Email</strong>. Duplicate records are merged automatically.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <ArrowRight className="w-4 h-4" />
                <span className="text-sm font-bold">Pipeline Automations</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                When a plan switch is detected, MediStay moves the GHL Opportunity to "Retention Alert" and tags it as <Badge variant="outline" className="text-[8px] h-4">RISK</Badge>.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 px-1">
              <History className="w-4 h-4 text-muted-foreground" />
              Recent Data Sync Events
            </h3>
            <div className="rounded-2xl border border-border bg-card divide-y overflow-hidden shadow-sm">
              {[
                { time: "2h ago", event: "GHL Contact Update", detail: "Robert Miller updated via webhook", status: "Success" },
                { time: "5h ago", event: "Automated Daily Resync", detail: "1,422 members scanned, no changes", status: "Success" },
                { time: "1d ago", event: "Manual Sync", detail: "Initiated by Agent JD", status: "Success" },
              ].map((log, i) => (
                <div key={i} className="p-4 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors">
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">{log.event}</p>
                    <p className="text-muted-foreground font-medium">{log.detail}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-mono text-[10px] text-muted-foreground">{log.time}</p>
                    <span className="text-[9px] font-black uppercase text-emerald-600">{log.status}</span>
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
