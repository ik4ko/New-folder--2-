
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lock, Fingerprint, History, ArrowLeft, ShieldAlert } from "lucide-react"
import Link from "next/link"

export default function HIPAASecureDoc() {
  return (
    <div className="space-y-16">
      <div className="space-y-6">
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Technical Overview</Badge>
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">HIPAA SECURE Standards</h1>
        <p className="text-xl text-muted-foreground font-bold leading-relaxed uppercase tracking-tight opacity-80">
          Technical and administrative safeguards protecting Medicare member data within the AegisSage ecosystem.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white space-y-4 shadow-xl border border-white/5">
          <Lock className="w-8 h-8 text-primary" />
          <h3 className="text-xl font-black uppercase tracking-tighter">Encryption</h3>
          <p className="text-[10px] font-medium text-slate-400 uppercase leading-relaxed italic">
            AES-256 for data at rest and TLS 1.3 for data in transit across all AegisSage modules.
          </p>
        </div>
        <div className="p-8 rounded-[2.5rem] bg-card border border-border space-y-4">
          <Fingerprint className="w-8 h-8 text-primary" />
          <h3 className="text-xl font-black uppercase tracking-tighter">Access</h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed opacity-70">
            Strict Multi-Factor Authentication (MFA) and Role-Based Access Control (RBAC).
          </p>
        </div>
        <div className="p-8 rounded-[2.5rem] bg-card border border-border space-y-4">
          <History className="w-8 h-8 text-primary" />
          <h3 className="text-xl font-black uppercase tracking-tighter">Auditing</h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed opacity-70">
            Every PHI read or write event is logged with IP, user ID, and timestamp metadata.
          </p>
        </div>
      </div>

      <section className="p-10 rounded-[3rem] border-2 border-dashed border-primary/20 bg-primary/5 space-y-6">
        <div className="flex items-center gap-4">
          <ShieldAlert className="w-8 h-8 text-primary" />
          <h2 className="text-2xl font-black uppercase tracking-tight">2025 CMS Interoperability Rule</h2>
        </div>
        <p className="text-sm font-bold text-muted-foreground leading-relaxed uppercase opacity-80">
          AegisSage is built to exceed the latest CMS requirements for agency transparency and data exchange. We provide clear opt-out mechanisms for beneficiaries and maintain a direct bridge to carrier compliance departments for dispute resolution.
        </p>
      </section>
    </div>
  )
}
