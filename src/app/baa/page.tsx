"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileCheck, ShieldCheck, Building2, Shield, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/logo"

export default function BAAPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      <header className="h-20 border-b border-border/50 px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-3">
          <Logo />
        </Link>
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest">
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
        </Button>
      </header>

      <main className="max-w-3xl mx-auto py-24 px-8 space-y-12">
        <div className="space-y-4">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">HIPAA Compliance</Badge>
          <h1 className="text-5xl font-black tracking-tighter uppercase">Business Associate Agreement</h1>
          <p className="text-lg font-bold text-muted-foreground uppercase tracking-tight">Required for all agencies accessing PHI through AegisSage.</p>
        </div>

        <section className="space-y-8">
          <div className="p-8 rounded-3xl bg-muted/20 border border-border space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              01. PHI Handling
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              AegisSage Intelligence Inc. acts as a Business Associate under HIPAA. We process Protected Health Information (PHI) solely to provide services outlined in your subscription agreement. PHI is encrypted at rest using AES-256-GCM and in transit via TLS 1.3.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-muted/20 border border-border space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary" />
              02. Subcontractors
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              We engage HIPAA-compliant subcontractors — Supabase (database + storage), Vercel (hosting), SRFax (HIPAA-compliant fax dispatch) — under equivalent BAA terms. No PHI is shared with any third party outside of these agreements without explicit agency consent.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-muted/20 border border-border space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-primary" />
              03. Breach Notification
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              In the event of a breach affecting PHI, AegisSage will notify the Covered Entity within 60 calendar days of discovery in accordance with 45 CFR § 164.410. Incident reports include nature of breach, PHI involved, and remediation steps taken.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-primary/5 border border-primary/20 space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-primary">
              <Shield className="w-5 h-5 text-primary" />
              04. Execute Your BAA
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              To execute a Business Associate Agreement with AegisSage Intelligence Inc., email{' '}
              <span className="text-foreground">compliance@aegissage.com</span> with your agency name and NPI number.
              We will return a countersigned BAA within 2 business days. A signed BAA is required before transmitting
              any Protected Health Information through our platform.
            </p>
          </div>
        </section>

        <div className="pt-12 text-center border-t border-border/50">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">AegisSage Intelligence Inc. | Compliance Division | HIPAA</p>
        </div>
      </main>
    </div>
  )
}
