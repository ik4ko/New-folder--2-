
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, Lock, Eye, FileCheck, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/logo"

export default function PrivacyPage() {
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
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Effective: Jan 2025</Badge>
          <h1 className="text-5xl font-black tracking-tighter uppercase">Privacy Policy</h1>
          <p className="text-lg font-bold text-muted-foreground uppercase tracking-tight">At MediStay, PHI security is our first priority. We operate under strict HIPAA Business Associate Agreements.</p>
        </div>

        <section className="space-y-8">
          <div className="p-8 rounded-3xl bg-muted/20 border border-border space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              01. Data Encryption
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              All member data (MBI numbers, DOB, Health conditions) is encrypted using AES-256 standards both at rest and in transit. Access is strictly governed by role-based permissions and Multi-Factor Authentication.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-muted/20 border border-border space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <Eye className="w-5 h-5 text-primary" />
              02. Use of Information
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              We process data solely for the purpose of providing retention services to the Agency. MediStay does not sell member data, nor do we share it with third parties outside of our BAA partners (AWS, Twilio, Spruce Health).
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-muted/20 border border-border space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-primary" />
              03. HIPAA Compliance
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              We maintain a 10-year retention policy for all SOA records and audit logs, fulfilling federal requirements for Medicare Advantage marketing and enrollment activities.
            </p>
          </div>
        </section>

        <div className="pt-12 text-center border-t border-border/50">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Questions? Contact privacy@medistay.io</p>
        </div>
      </main>
    </div>
  )
}
