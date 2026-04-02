
"use client"

import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Mic2, Save, Sparkles } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function MayaSettingsPage() {
  const router = useRouter()
  const { mayaSettings, updateMayaSettings } = useAppStore()

  const handleSave = () => {
    toast({ title: "Maya Optimized", description: "Check-in script and voice profiles updated." })
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground uppercase tracking-tighter">Maya AI Voice</h1>
        </div>
        <div className="flex items-center gap-6">
          <Button variant="ghost" className="rounded-xl h-10 font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground" onClick={() => router.push('/dashboard')}>
            Discard
          </Button>
          <Button onClick={handleSave} className="rounded-2xl h-11 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 px-8 shadow-xl shadow-primary/20 text-white text-[10px] gap-2">
            <Save className="w-4 h-4" />
            Update Agent
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-4xl mx-auto w-full space-y-12">
        <div className="space-y-2">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
            <Mic2 className="w-4 h-4" />
            Agent Personality
          </h2>
          <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Fine-tune Maya's outbound clinical personality.</p>
        </div>

        <Card className="rounded-[2.5rem] border border-border shadow-sm bg-card">
          <CardContent className="p-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Active Voice Profile</Label>
                <div className="flex gap-3">
                  <Button 
                    variant={mayaSettings.voiceName === 'Algenib' ? 'default' : 'outline'} 
                    className="flex-1 rounded-2xl h-14 font-black uppercase text-[10px]"
                    onClick={() => updateMayaSettings({ voiceName: 'Algenib' })}
                  >
                    Algenib (Female)
                  </Button>
                  <Button 
                    variant={mayaSettings.voiceName === 'Achernar' ? 'default' : 'outline'} 
                    className="flex-1 rounded-2xl h-14 font-black uppercase text-[10px]"
                    onClick={() => updateMayaSettings({ voiceName: 'Achernar' })}
                  >
                    Achernar (Male)
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground">Auto-Escalation</Label>
                  <Switch 
                    checked={mayaSettings.autoEscalate}
                    onCheckedChange={(val) => updateMayaSettings({ autoEscalate: val })}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-black uppercase leading-relaxed opacity-60">Maya will instantly alert a broker if disenrollment keywords are detected.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Global Retention Script</Label>
                <Badge variant="outline" className="text-[9px] font-black uppercase bg-primary/5 text-primary border-primary/20 gap-1.5">
                  <Sparkles className="w-3 h-3" /> AI Enhanced
                </Badge>
              </div>
              <Textarea 
                value={mayaSettings.script}
                onChange={(e) => updateMayaSettings({ script: e.target.value })}
                className="min-h-[200px] rounded-3xl bg-muted/20 border-border p-6 text-sm font-medium leading-relaxed italic"
              />
              <div className="flex flex-wrap justify-center gap-4">
                {['{member_name}', '{carrier}', '{days_enrolled}', '{current_date}'].map(token => (
                  <Badge key={token} variant="outline" className="text-[9px] font-black uppercase bg-primary/5 text-primary border-primary/20">{token}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
