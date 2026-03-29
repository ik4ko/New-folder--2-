
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileCheck, Shield, Scale, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function BAADoc() {
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
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Legal Framework</Badge>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">Business Associate Agreement (BAA)</h1>
          <p className="text-xl text-muted-foreground font-bold leading-relaxed uppercase tracking-tight opacity-80">
            Our formal commitment to HIPAA data security standards.
          </p>
        </div>

        <section className="p-12 rounded-[3rem] bg-muted/30 border border-border space-y-8">
          <h2 className="text-2xl font-black uppercase tracking-tight">Covered Entities</h2>
          <p className="text-sm font-bold text-muted-foreground leading-relaxed uppercase opacity-70">
            MediStay operates as a Business Associate to your Agency (the Covered Entity). We maintain downstream BAAs with our core infrastructure partners to ensure a closed-loop security environment.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-border text-center space-y-2">
              <p className="text-lg font-black text-primary">AWS</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Infrastructure</p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-border text-center space-y-2">
              <p className="text-lg font-black text-primary">Twilio</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">AI Voice</p>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-border text-center space-y-2">
              <p className="text-lg font-black text-primary">Spruce</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Clinical Fax</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
