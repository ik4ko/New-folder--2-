
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileCheck, Shield, Scale, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function BAADoc() {
  return (
    <div className="space-y-16">
      <div className="space-y-6">
        <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Legal Framework</Badge>
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">Business Associate Agreement (BAA)</h1>
        <p className="text-xl text-muted-foreground font-bold leading-relaxed uppercase tracking-tight opacity-80">
          Our formal commitment to HIPAA data security standards and 2025 CMS interoperability rules.
        </p>
      </div>

      <section className="p-12 rounded-[3rem] bg-muted/30 border border-border space-y-8">
        <h2 className="text-2xl font-black uppercase tracking-tight">Covered Entities</h2>
        <p className="text-sm font-bold text-muted-foreground leading-relaxed uppercase opacity-70">
          MediStay operates as a Business Associate to your Agency (the Covered Entity). We maintain downstream BAAs with our core infrastructure partners to ensure a closed-loop security environment.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-border text-center space-y-2">
            <p className="text-lg font-black text-primary uppercase tracking-tighter">AWS</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Cloud Infrastructure</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-border text-center space-y-2">
            <p className="text-lg font-black text-primary uppercase tracking-tighter">Twilio</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Secure AI Voice</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-border text-center space-y-2">
            <p className="text-lg font-black text-primary uppercase tracking-tighter">Spruce</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Clinical Fax Bridge</p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-black uppercase tracking-tight">PHI Handling Protocols</h2>
        <div className="space-y-4">
          {[
            { title: "Encryption at Rest", desc: "All Protected Health Information (PHI) is encrypted using AES-256 standard within our isolated multi-tenant architecture." },
            { title: "10-Year Audit Logs", desc: "Every read/write action on a member record is cryptographically signed and archived for federal retention compliance." },
            { title: "Zero-Knowledge MBIs", desc: "Medicare Beneficiary Identifiers are hashed before synchronization to prevent plaintext leaks during transmission." }
          ].map((item, i) => (
            <div key={i} className="flex gap-6 p-6 rounded-3xl border border-border bg-card">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black uppercase text-sm tracking-tight">{item.title}</h4>
                <p className="text-xs font-bold text-muted-foreground uppercase leading-relaxed opacity-70">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
