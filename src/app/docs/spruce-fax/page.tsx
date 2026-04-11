
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Printer, ShieldCheck, FileText, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/logo"

export default function SpruceFaxDoc() {
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
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Module 3</Badge>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">Spruce Health Fax Agent</h1>
          <p className="text-xl text-muted-foreground font-bold leading-relaxed uppercase tracking-tight opacity-80">
            Automated chronic care verification via HIPAA-compliant clinical faxing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-muted/20 border border-border flex flex-col items-center gap-4 group hover:bg-muted/30 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-white border border-border flex items-center justify-center text-primary shadow-sm">
              <Printer className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight">Clinical Bridge</h3>
            <p className="text-xs font-bold text-muted-foreground uppercase leading-relaxed text-center">
              Direct API integration with Spruce Health for transmission of pre-filled SSBCI verification forms.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-muted/20 border border-border flex flex-col items-center gap-4 group hover:bg-muted/30 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-white border border-border flex items-center justify-center text-emerald-600 shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight">Legal Audit Trail</h3>
            <p className="text-xs font-bold text-muted-foreground uppercase leading-relaxed text-center">
              Every fax confirmation is signed and archived for the federally mandated 10-year retention period.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
