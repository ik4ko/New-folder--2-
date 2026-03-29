
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, ShieldCheck, Search, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CMSSwitchDoc() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-20 border-b border-border/50 px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg">M</div>
          <span className="text-xl font-black tracking-tighter uppercase">MediStay Docs</span>
        </Link>
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest">
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Home</Link>
        </Button>
      </header>

      <main className="max-w-4xl mx-auto py-24 px-8 space-y-16">
        <div className="space-y-6">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Module 1</Badge>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">CMS Switch Detection</h1>
          <p className="text-xl text-muted-foreground font-bold leading-relaxed uppercase tracking-tight opacity-80">
            Real-time monitoring of member enrollment status via direct MARx snapshot polling.
          </p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <h3 className="text-2xl font-black uppercase tracking-tight">The 24-Hour Window</h3>
            <p className="text-sm font-bold text-muted-foreground leading-relaxed uppercase opacity-70">
              When a member switches carriers, it often takes weeks for commission reports to surface. MediStay detects these switches nightly, giving agents a 24-hour window to conduct outreach and retain the member.
            </p>
          </div>
          <div className="p-8 rounded-[2.5rem] bg-muted/30 border border-border space-y-4">
            <Search className="w-8 h-8 text-primary" />
            <h4 className="font-black uppercase text-sm">Nightly Snapshot Polls</h4>
            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">
              We poll carrier data and CMS enrollment snapshots every night at 2:00 AM EST to identify status anomalies.
            </p>
          </div>
        </section>

        <div className="p-12 rounded-[3rem] bg-slate-950 text-white space-y-8">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-center">Technical Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl font-black text-primary">100%</div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">MARx Accuracy</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl font-black text-primary">&lt; 2h</div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Detection Latency</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-4xl font-black text-primary">AES</div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">End-to-End Encryption</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
