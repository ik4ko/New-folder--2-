
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, PhoneCall, Headphones, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function MayaVoiceDoc() {
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
          <Badge className="bg-accent/10 text-accent border-accent/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Module 2</Badge>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">Maya AI Member Agent</h1>
          <p className="text-xl text-muted-foreground font-bold leading-relaxed uppercase tracking-tight opacity-80">
            Autonomous voice check-ins designed to detect dissatisfaction before it turns into churn.
          </p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="p-10 rounded-[3rem] bg-card border border-border shadow-inner space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Headphones className="w-32 h-32 text-primary" />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent animate-pulse">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase text-accent tracking-widest leading-none">AI Scripting</p>
                <p className="text-sm font-bold italic text-muted-foreground">"Dynamic Sentiment Analysis"</p>
              </div>
            </div>
            <p className="text-xs font-bold text-muted-foreground text-left uppercase leading-relaxed opacity-70">
              Maya detects tone and specific churn keywords (e.g., "my doctor left", "premium is too high") and escalates to your brokers instantly.
            </p>
          </div>
          <div className="space-y-4 flex flex-col justify-center">
            <h3 className="text-2xl font-black uppercase tracking-tight">Personalized Outreach</h3>
            <p className="text-sm font-bold text-muted-foreground leading-relaxed uppercase opacity-70">
              Check-ins occur automatically at Day 7, Day 30, and Day 75 of a new enrollment. Maya uses member-specific data to ensure the conversation feels human and authoritative.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
