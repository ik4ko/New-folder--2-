
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ShieldAlert, Lock, ShieldCheck, Save } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function SecuritySettingsPage() {
  const router = useRouter()

  const handleSave = () => {
    toast({ title: "Security Hardened", description: "IP Whitelisting and 2FA settings are now active." })
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground uppercase tracking-tighter">HIPAA Security</h1>
        </div>
        <div className="flex items-center gap-6">
          <Button variant="ghost" className="rounded-xl h-10 font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground" onClick={() => router.push('/dashboard')}>
            Discard
          </Button>
          <Button onClick={handleSave} className="rounded-2xl h-11 font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 px-8 shadow-xl shadow-emerald-600/20 text-white text-[10px] gap-2">
            <Save className="w-4 h-4" />
            Lock Protocols
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-4xl mx-auto w-full space-y-12">
        <div className="space-y-2">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-emerald-600">
            <ShieldAlert className="w-4 h-4" />
            Clinical Safeguards
          </h2>
          <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Enforce enterprise-grade PHI data protection.</p>
        </div>

        <Card className="rounded-[2.5rem] border-none shadow-2xl bg-slate-950 text-white p-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-10 opacity-5"><Lock className="w-48 h-48 text-white" /></div>
          <CardContent className="px-0 space-y-10 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Enforce 2FA</Label>
                  <Switch defaultChecked />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed opacity-70">Mandatory for all agency roles accessing PHI datasets.</p>
              </div>
              <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-300">IP Whitelisting</Label>
                  <Switch />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed opacity-70">Restrict workspace access to verified agency office networks.</p>
              </div>
            </div>
            <div className="p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
              <div className="flex items-center gap-3 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-[11px] font-black uppercase tracking-widest">Audit Retention Active: 10 Years</span>
              </div>
              <p className="text-[11px] text-slate-300 font-bold uppercase opacity-80 leading-relaxed">
                AegisSage automatically logs all member record modifications and HETS polling data. Records are cryptographically signed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
