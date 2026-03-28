"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShieldCheck, FileCheck, Lock, History, Search, Download, FileText, Database, ShieldAlert } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function ComplianceVaultPage() {
  const members = useAppStore((state) => state.members)

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Compliance Vault</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Immutable PHI & SOA Archive</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-2xl h-10 text-xs font-bold border-border">
              <Database className="w-4 h-4 mr-2" /> Data Export
            </Button>
            <Button className="rounded-2xl h-10 text-xs font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <FileCheck className="w-4 h-4 mr-2" />
              Generate Audit Package
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30 dark:bg-background">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-3xl border-none shadow-sm bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">SOA Integrity Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-emerald-700 tracking-tighter">99.2%</div>
                <p className="text-[10px] text-emerald-600/70 mt-1 font-bold">Audit Target: &gt;95%</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest">Signed SOAs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-primary tracking-tighter">{members.filter(m => m.soaStatus === 'Completed').length}</div>
                <p className="text-[10px] text-primary/70 mt-1 font-bold">10-year retention active</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active PTC Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black tracking-tighter">892</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold">Permission to Contact active</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Scope of Appointment (SOA) Repository
              </h2>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search by name, MBI, or date..." className="pl-9 h-10 rounded-2xl text-[11px] bg-card border-none shadow-sm focus-visible:ring-primary" />
              </div>
            </div>
            
            <Card className="rounded-3xl border-none shadow-sm bg-card overflow-hidden">
              <div className="divide-y">
                {members.filter(m => m.soaStatus === 'Completed').length > 0 ? members.filter(m => m.soaStatus === 'Completed').map((member, i) => (
                  <div key={i} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{member.fullName}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Signed: {member.soaDate || 'Unknown'}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="text-[9px] text-muted-foreground font-mono uppercase">{member.medicareId}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[9px] font-black uppercase bg-slate-50 px-2 py-0.5">E-SIGNED (IP: 72.1.*)</Badge>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary transition-all">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="p-12 text-center text-muted-foreground font-medium">No signed SOAs found in archive.</div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2 px-2">
              <History className="w-4 h-4 text-primary" />
              PHI Access & Modification Log
            </h2>
            <Card className="rounded-3xl border-none shadow-xl bg-slate-900 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Lock className="w-20 h-24 text-white" />
              </div>
              <div className="p-8 font-mono text-[10px] space-y-2 relative z-10 leading-relaxed">
                <p className="text-slate-500 border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-3 h-3" /> // IMMUTABLE AUDIT TRAIL // HIPAA LOGGING ACTIVE // AES-256 ENCRYPTED
                </p>
                <div className="space-y-1.5 overflow-hidden">
                  <p className="animate-in fade-in slide-in-from-left-2 duration-300"><span className="text-emerald-400">[2024-11-20 10:42:11]</span> <span className="text-slate-400">USER_AUTH:</span> Agent ID 123 authenticated via MFA (Biometric)</p>
                  <p className="animate-in fade-in slide-in-from-left-2 duration-500"><span className="text-emerald-400">[2024-11-20 10:45:02]</span> <span className="text-slate-400">PHI_ACCESS:</span> Record ID 8821 accessed for SSBCI module verification</p>
                  <p className="animate-in fade-in slide-in-from-left-2 duration-700"><span className="text-amber-400">[2024-11-20 11:02:45]</span> <span className="text-slate-400">DATA_SYNC:</span> Blue Button 2.0 refresh initiated for cluster A (Success)</p>
                  <p className="animate-in fade-in slide-in-from-left-2 duration-1000"><span className="text-emerald-400">[2024-11-20 11:30:00]</span> <span className="text-slate-400">SYSTEM:</span> Automated check of AEP Shield consent flags completed (1,244 scanned)</p>
                  <p className="animate-in fade-in slide-in-from-left-2 duration-1000 delay-200"><span className="text-blue-400">[2024-11-20 12:15:33]</span> <span className="text-slate-400">FAX_SENT:</span> SSBCI-PKG-SJ transmitted to Provider ID NPI-99201</p>
                </div>
                <div className="pt-4 flex items-center gap-3 text-slate-500 italic border-t border-slate-800 mt-4">
                  <Badge className="bg-slate-800 text-slate-400 border-none text-[8px] font-black">SHA-256: 8f2e...3a11</Badge>
                  <span>Records signed with HMAC-SHA256</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
