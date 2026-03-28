
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShieldCheck, FileCheck, Lock, History, Search, Download, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function ComplianceVaultPage() {
  const members = useAppStore((state) => state.members)

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Compliance Vault</h1>
          </div>
          <Button variant="outline" className="rounded-xl h-9 text-xs font-bold border-primary text-primary">
            <FileCheck className="w-4 h-4 mr-2" />
            Download Monthly Audit
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-emerald-600">SOA Accuracy Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-700">99.2%</div>
                <p className="text-[10px] text-emerald-600/70 mt-1 font-bold">Industry Target: >95%</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-primary">Signed SOAs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-primary">1,244</div>
                <p className="text-[10px] text-primary/70 mt-1 font-bold">10-year retention active</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Active PTC Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">892</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold">Permission to Contact active</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2 px-1">
                <FileText className="w-4 h-4 text-primary" />
                Scope of Appointment (SOA) Repository
              </h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search documents..." className="pl-9 h-8 rounded-lg text-[11px]" />
              </div>
            </div>
            
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm divide-y">
              {members.filter(m => m.soaStatus === 'Completed').map((member, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{member.fullName}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Signed: {member.soaDate || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] font-black">E-SIGNED</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2 px-1">
              <History className="w-4 h-4 text-primary" />
              PHI Access & Modification Log
            </h2>
            <div className="p-6 rounded-2xl border bg-slate-900 text-slate-100 font-mono text-[10px] space-y-2 shadow-xl">
              <p className="text-slate-500 border-b border-slate-800 pb-2 mb-4">// IMMUTABLE AUDIT TRAIL // HIPAA LOGGING ACTIVE</p>
              <p><span className="text-emerald-400">[2024-11-20 10:42:11]</span> USER_AUTH: Agent ID 123 authenticated via MFA</p>
              <p><span className="text-emerald-400">[2024-11-20 10:45:02]</span> PHI_ACCESS: Record ID Robert_Miller accessed for module monitoring</p>
              <p><span className="text-amber-400">[2024-11-20 11:02:45]</span> DATA_SYNC: Blue Button 2.0 refresh initiated for member cluster A</p>
              <p><span className="text-emerald-400">[2024-11-20 11:30:00]</span> SYSTEM: Automated check of AEP Shield consent flags completed</p>
              <div className="pt-2 flex items-center gap-2 text-slate-500 italic">
                <Lock className="w-3 h-3" />
                Records signed with HMAC-SHA256
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
