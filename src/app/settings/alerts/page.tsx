
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Bell, Save } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function AlertSettingsPage() {
  const router = useRouter()

  const handleSave = () => {
    toast({ title: "Sync Alerts Active", description: "Notification preferences have been persisted." })
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground uppercase tracking-tighter">Sync Alerts</h1>
        </div>
        <div className="flex items-center gap-6">
          <Button variant="ghost" className="rounded-xl h-10 font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground" onClick={() => router.push('/dashboard')}>
            Discard
          </Button>
          <Button onClick={handleSave} className="rounded-2xl h-11 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 px-8 shadow-xl shadow-primary/20 text-white text-[10px] gap-2">
            <Save className="w-4 h-4" />
            Save Alerts
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-4xl mx-auto w-full space-y-12">
        <div className="space-y-2">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
            <Bell className="w-4 h-4" />
            Notification Nodes
          </h2>
          <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Manage real-time agency synchronization alerts.</p>
        </div>

        <Card className="rounded-[2.5rem] border border-border shadow-sm bg-card p-10">
          <div className="grid grid-cols-1 gap-6">
            {[
              { title: "MARx Switch Detection", desc: "Push & SMS alert upon detection of a carrier disenrollment event." },
              { title: "Daily CRM Snapshot", desc: "Overnight summary of all updated GoHighLevel contact records." },
              { title: "Spruce Fax Confirmation", desc: "Alert when a provider confirms chronic condition verification." },
              { title: "AEP Shield Activation", desc: "Notification when pre-AEP loyalty triggers are completed." },
              { title: "PTC Expiry Warning", desc: "Alert 30 days before a member's contact permission expires." }
            ].map((alert, i) => (
              <div key={i} className="flex items-center justify-between p-8 rounded-3xl bg-muted/20 border border-border hover:bg-muted/30 transition-all">
                <div className="space-y-1">
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">{alert.title}</p>
                  <p className="text-[11px] text-muted-foreground font-black uppercase opacity-60 italic">{alert.desc}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
