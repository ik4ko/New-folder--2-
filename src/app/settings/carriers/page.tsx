
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Briefcase, Plus, Save } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function CarrierSettingsPage() {
  const router = useRouter()

  const handleSave = () => {
    toast({ title: "Contracts Synced", description: "Carrier state appointments and writing IDs updated." })
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground uppercase tracking-tighter">Carrier Contracts</h1>
        </div>
        <div className="flex items-center gap-6">
          <Button variant="ghost" className="rounded-xl h-10 font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground" onClick={() => router.push('/dashboard')}>
            Discard
          </Button>
          <Button onClick={handleSave} className="rounded-2xl h-11 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 px-8 shadow-xl shadow-primary/20 text-white text-[10px] gap-2">
            <Save className="w-4 h-4" />
            Save Contracts
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-4xl mx-auto w-full space-y-12">
        <div className="space-y-2">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
            <Briefcase className="w-4 h-4" />
            Appointment Portfolio
          </h2>
          <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Manage your state appointments and writing IDs.</p>
        </div>

        <Card className="rounded-[2.5rem] border border-border shadow-sm bg-card overflow-hidden">
          <CardContent className="p-10 space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {[
                { carrier: "UnitedHealthcare", states: "CA, TX, FL", writingId: "UHC-99201" },
                { carrier: "Humana", states: "CA, NV", writingId: "HUM-7721" },
                { carrier: "Clover Health", states: "CA", writingId: "CLV-0012" },
                { carrier: "Aetna", states: "TX, NY", writingId: "AET-8821" }
              ].map((contract, i) => (
                <div key={i} className="flex items-center justify-between p-6 rounded-3xl border bg-muted/10 group hover:bg-muted/20 transition-all">
                  <div>
                    <p className="text-sm font-black uppercase text-foreground">{contract.carrier}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Active in: {contract.states}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-black text-primary">{contract.writingId}</p>
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Verified Contract</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full rounded-2xl border-dashed border-2 h-14 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 transition-all">
              <Plus className="w-4 h-4 mr-2" /> Add New Carrier Appointment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
