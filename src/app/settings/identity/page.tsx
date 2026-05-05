
"use client"

import { useAppStore } from "@/lib/store"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Building2, Save } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function IdentitySettingsPage() {
  const router = useRouter()
  const { agencyProfile, updateAgencyProfile, syncToCloudVault, encryptionKey } = useAppStore()

  const handleSave = async () => {
    const userId = auth?.currentUser?.uid
    if (encryptionKey && db && userId) {
      toast({ title: "Hardening Data", description: "Encrypting agency identity for cloud vault..." })
      await syncToCloudVault(db, userId)
    }
    toast({ title: "Identity Saved", description: "Your agency identity has been updated and persisted." })
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground uppercase tracking-tighter">Agency Identity</h1>
        </div>
        <div className="flex items-center gap-6">
          <Button variant="ghost" className="rounded-xl h-10 font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground" onClick={() => router.push('/dashboard')}>
            Discard
          </Button>
          <Button onClick={handleSave} className="rounded-2xl h-11 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 px-8 shadow-xl shadow-primary/20 text-white text-[10px] gap-2">
            <Save className="w-4 h-4" />
            Save Identity
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-3xl mx-auto w-full space-y-12">
        <div className="space-y-2">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
            <Building2 className="w-4 h-4" />
            Management Mode
          </h2>
          <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Configure your primary agency operational details.</p>
        </div>

        <Card className="rounded-[2.5rem] border border-border shadow-sm bg-card overflow-hidden">
          <CardContent className="p-10 space-y-10">
            <div className="flex items-center justify-between p-8 rounded-3xl bg-muted/20 border border-border">
              <div className="space-y-1">
                <Label className="text-sm font-black text-foreground uppercase">Solo Broker Mode</Label>
                <p className="text-[11px] text-muted-foreground font-bold leading-relaxed max-w-sm uppercase opacity-60">
                  Optimized for independent agents. Removes complex hierarchy modules.
                </p>
              </div>
              <Switch 
                checked={agencyProfile.isSolo} 
                onCheckedChange={(val) => updateAgencyProfile({ isSolo: val })} 
              />
            </div>

            <div className="flex flex-col gap-10">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {agencyProfile.isSolo ? "Broker Name" : "Agency Name"}
                </Label>
                <Input 
                  value={agencyProfile.name}
                  onChange={(e) => updateAgencyProfile({ name: e.target.value })}
                  className="rounded-2xl h-14 bg-background border-border text-foreground font-black pl-6 shadow-inner uppercase text-sm"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Agency NPN (Licensed)</Label>
                <Input 
                  value={agencyProfile.licenseNumber}
                  onChange={(e) => updateAgencyProfile({ licenseNumber: e.target.value })}
                  className="rounded-2xl h-14 bg-background border-border font-mono text-foreground font-black pl-6 shadow-inner text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
