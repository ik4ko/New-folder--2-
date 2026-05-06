
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Lock, History, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/logo"

export default function ComplianceVaultDoc() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-20 border-b border-border/50 px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-3">
          <Logo />
          <span className="text-xl font-black tracking-tighter uppercase opacity-50 ml-[-8px]">Docs</span>
        </Link>
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest">
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
        </Button>
      </header>

      <main className="max-w-4xl mx-auto py-24 px-8 space-y-16">
        <div className="space-y-6">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Security Protocol</Badge>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">The Compliance Vault</h1>
          <p className="text-xl text-muted-foreground font-bold leading-relaxed uppercase tracking-tight opacity-80">
            Enterprise-grade infrastructure for the storage and auditing of protected health information.
          </p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <h3 className="text-2xl font-black uppercase tracking-tight">AES-256 Encryption</h3>
            <p className="text-sm font-bold text-muted-foreground leading-relaxed uppercase opacity-70">
              All member data is encrypted at rest using AES-256 standards. AegisSage uses a zero-knowledge field approach for sensitive identifiers like full SSNs, which are never stored in plaintext.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-black uppercase tracking-tight">10-Year Audit Chain</h3>
            <p className="text-sm font-bold text-muted-foreground leading-relaxed uppercase opacity-70">
              To meet CMS requirements, all access to PHI is logged in an immutable audit trail. This trail is retained for 10 years and is available for export during regulatory reviews.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
