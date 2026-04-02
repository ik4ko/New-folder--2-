
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Globe, Save, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function ComplianceSettingsPage() {
  const router = useRouter()

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground uppercase tracking-tighter">Compliance Logs</h1>
        </div>
        <div className="flex items-center gap-6">
          <Button variant="ghost" className="rounded-xl h-10 font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground" onClick={() => router.push('/dashboard')}>
            Back
          </Button>
          <Button onClick={() => toast({ title: "Inventory Downloaded", description: "Latest compliance record package prepared." })} className="rounded-2xl h-11 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 px-8 shadow-xl shadow-primary/20 text-white text-[10px] gap-2">
            <Download className="w-4 h-4" />
            Download Package
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-4xl mx-auto w-full space-y-12">
        <div className="space-y-2">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
            <ShieldCheck className="w-4 h-4" />
            Federal Record Retention
          </h2>
          <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Review your agency's federal record retention status.</p>
        </div>

        <Card className="rounded-[2.5rem] border border-border shadow-sm bg-card overflow-hidden">
          <CardContent className="p-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="p-8 rounded-3xl bg-background border border-border space-y-4 shadow-inner">
                <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Data Residency
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed uppercase font-black opacity-70 italic">
                  All member PHI is isolated in US-East-1 (HIPAA Compliant AWS Cluster).
                </p>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[9px] px-3">LOCKED</Badge>
              </div>
              <div className="p-8 rounded-3xl bg-background border border-border space-y-4 shadow-inner">
                <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Save className="w-4 h-4 text-primary" />
                  Retention Lifecycle
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed uppercase font-black opacity-70 italic">
                  CMS requirement: 10 Year Archive active for all SOA and enrollment logs.
                </p>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[9px] px-3">ACTIVE</Badge>
              </div>
            </div>
            <div className="p-10 rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 text-center space-y-4">
              <ShieldCheck className="w-10 h-10 text-primary opacity-40 mx-auto" />
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Annual Compliance Inventory</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-bold uppercase opacity-60">
                  Generate a complete timestamped inventory of all signed Scope of Appointments and call recordings for regulatory review.
                </p>
                <Button variant="link" className="text-[10px] font-black text-primary uppercase tracking-widest underline-offset-4">
                  Download Inventory
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
