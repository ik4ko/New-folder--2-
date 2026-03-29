
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Printer, FileText, ShieldCheck, Zap, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

export default function SecureFaxLP() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
      <TooltipProvider delayDuration={0}>
        <div className="max-w-4xl w-full space-y-12 text-center">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px] rounded-full">
            Powered by Spruce Health
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">
            Automated Clinical <span className="text-primary">Faxing</span>. 100% HIPAA Secure.
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground font-bold max-w-2xl mx-auto uppercase tracking-tight opacity-80 leading-snug">
            Activate chronic care benefits (SSBCI) without the paperwork. MediStay faxes PCP offices directly via Spruce Health to verify conditions and lock in member loyalty.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
            <div className="p-8 rounded-3xl bg-muted/20 border border-border flex flex-col items-center gap-4 group hover:bg-muted/30 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-white border border-border flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                <Printer className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight">Spruce API Bridge</h3>
              <p className="text-xs font-bold text-muted-foreground uppercase leading-relaxed text-center">Instant transmission of pre-filled Medicare Part C chronic condition verification forms.</p>
            </div>
            <div className="p-8 rounded-3xl bg-muted/20 border border-border flex flex-col items-center gap-4 group hover:bg-muted/30 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-white border border-border flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight">Audit Trail Ready</h3>
              <p className="text-xs font-bold text-muted-foreground uppercase leading-relaxed text-center">Every fax confirmation is logged in the MediStay vault for a 10-year federally mandated retention period.</p>
            </div>
          </div>

          <div className="pt-12">
            <Button size="lg" className="h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20" asChild>
              <Link href="/dashboard">Access Fax Center <ArrowRight className="w-5 h-5" /></Link>
            </Button>
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
}
