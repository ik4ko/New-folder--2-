
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Scale, ShieldAlert, Gavel, Globe, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/logo"

export default function TermsPage() {
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
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Service Agreement</Badge>
          <h1 className="text-5xl font-black tracking-tighter uppercase">Terms of Service</h1>
          <p className="text-lg font-bold text-muted-foreground uppercase tracking-tight">Legal framework for the AegisSage Medicare Retention Platform.</p>
        </div>

        <section className="space-y-8">
          <div className="p-8 rounded-3xl bg-muted/20 border border-border space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <Scale className="w-5 h-5 text-primary" />
              01. Agency Responsibility
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              Users of AegisSage represent that they are licensed Medicare agents in good standing. Agencies are responsible for ensuring all AI-generated check-ins and VCC faxes comply with local carrier and CMS guidelines.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-muted/20 border border-border space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              02. Subscription & Billing
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              The $99/mo Entry Plan (or $999/year) and other tiers are billed monthly or annually. Cancellations take effect at the end of the current billing cycle. All transactions are handled via our BAA-compliant payment processor.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-muted/20 border border-border space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-primary" />
              03. BAA Requirement
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              Access to the Command Center is contingent upon the Agency having a signed Business Associate Agreement (BAA) on file with AegisSage Intelligence Inc.
            </p>
          </div>
        </section>

        <div className="pt-12 text-center border-t border-border/50">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">AegisSage Intelligence Inc. | Compliance Division</p>
        </div>
      </main>
    </div>
  )
}
