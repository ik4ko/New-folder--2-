
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link2, RefreshCw, Database, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function GHLSyncDoc() {
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
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Module 4</Badge>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">GoHighLevel Integration</h1>
          <p className="text-xl text-muted-foreground font-bold leading-relaxed uppercase tracking-tight opacity-80">
            Bi-directional synchronization between MediStay Intelligence and your GoHighLevel CRM.
          </p>
        </div>

        <section className="p-10 rounded-[3rem] bg-card border border-border shadow-2xl space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight">Field Mapping Standard</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-primary tracking-widest">Clinical Data In</p>
              <p className="text-xs font-bold text-muted-foreground leading-relaxed uppercase">
                Medicare MBIs, Carriers, and Plan Effective dates are pulled automatically from GHL Custom Fields.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Retention Scores Out</p>
              <p className="text-xs font-bold text-muted-foreground leading-relaxed uppercase">
                MediStay pushes calculated retention scores and churn risk tags back to GHL to trigger automated campaigns.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
