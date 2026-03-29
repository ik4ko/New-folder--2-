
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lock, Fingerprint, History, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function HIPAASecureDoc() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-20 border-b border-border/50 px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg">M</div>
          <span className="text-xl font-black tracking-tighter uppercase">MediStay Docs</span>
        </Link>
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest">
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
        </Button>
      </header>

      <main className="max-w-4xl mx-auto py-24 px-8 space-y-16">
        <div className="space-y-6">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Technical Overview</Badge>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">HIPAA SECURE Standards</h1>
          <p className="text-xl text-muted-foreground font-bold leading-relaxed uppercase tracking-tight opacity-80">
            Technical and administrative safeguards protecting Medicare member data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white space-y-4 shadow-xl">
            <Lock className="w-8 h-8 text-primary" />
            <h3 className="text-xl font-black uppercase tracking-tighter">Encryption</h3>
            <p className="text-[10px] font-medium text-slate-400 uppercase leading-relaxed">
              AES-256 for data at rest and TLS 1.3 for data in transit across all MediStay modules.
            </p>
          </div>
          <div className="p-8 rounded-[2.5rem] bg-card border border-border space-y-4">
            <Fingerprint className="w-8 h-8 text-primary" />
            <h3 className="text-xl font-black uppercase tracking-tighter">Access</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">
              Strict Multi-Factor Authentication (MFA) and Role-Based Access Control (RBAC).
            </p>
          </div>
          <div className="p-8 rounded-[2.5rem] bg-card border border-border space-y-4">
            <History className="w-8 h-8 text-primary" />
            <h3 className="text-xl font-black uppercase tracking-tighter">Auditing</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">
              Every PHI read or write event is logged with IP, user ID, and timestamp metadata.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
