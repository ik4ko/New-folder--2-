
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PhoneCall, Play, Headphones, MessageSquare, TrendingUp, Sparkles, BrainCircuit, User } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"

export default function CheckInsPage() {
  const members = useAppStore((state) => state.members)
  
  const callLogs = members
    .filter(m => m.checkInStatus !== 'scheduled')
    .map(m => ({
      id: m.id,
      name: m.fullName,
      type: m.status === 'active' ? "Day 30" : "Retention Outreach",
      sentiment: m.retentionScore > 85 ? "Positive" : m.retentionScore > 60 ? "Neutral" : "Negative",
      duration: "2:45",
      status: m.checkInStatus === 'escalated' ? "Escalated" : "Completed"
    }))

  const handleListen = (name: string) => {
    toast({ title: "Accessing HIPAA Vault", description: `Loading recording for ${name}...` })
  }

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <PhoneCall className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Maya AI: Member Check-ins</h1>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 font-bold">TWILIO VOICE: ACTIVE</Badge>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#F7F4F0]/30 dark:bg-background">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="rounded-2xl border-border bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Call Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{members.filter(m => m.checkInStatus === 'scheduled').length}</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold">Autonomous Schedule: ON</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Escalation Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-amber-600">
                  {Math.round((members.filter(m => m.checkInStatus === 'escalated').length / members.length) * 100)}%
                </div>
                <Progress value={12} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Talk Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-primary">422m</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold">Avg 2.8m / call</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sentiment Index</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-600">94%</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold">Positive/Neutral response</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Recent AI Conversations
              </h2>
              <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest">View History</Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {callLogs.length > 0 ? callLogs.map((log, i) => (
                <div key={i} className="group p-5 rounded-2xl border bg-card hover:border-primary/30 transition-all flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{log.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 border-primary/20 bg-primary/5">{log.type}</Badge>
                        <span className="text-[10px] text-muted-foreground font-medium">Duration: {log.duration}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Sentiment</p>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] rounded-lg font-black ${
                          log.sentiment === 'Positive' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                          log.sentiment === 'Negative' ? 'text-destructive border-destructive/20 bg-destructive/5' :
                          'text-amber-600 border-amber-200 bg-amber-50'
                        }`}
                      >
                        {log.sentiment}
                      </Badge>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Outcome</p>
                      <span className={`text-[10px] font-black uppercase ${log.status === 'Escalated' ? 'text-destructive' : 'text-emerald-600'}`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 hover:bg-primary/5">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button onClick={() => handleListen(log.name)} variant="outline" size="icon" className="rounded-xl h-9 w-9 border-primary/20 text-primary hover:bg-primary/5">
                        <Play className="w-4 h-4 fill-primary" />
                      </Button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-card">
                  <BrainCircuit className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground font-bold">No completed AI calls yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-8 rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Maya AI script updated</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium italic">
                "Hi, this is Maya from the MediStay team. We've detected a possible change in your provider network and wanted to ensure your doctors still accept your current coverage..."
              </p>
              <Button variant="link" className="text-xs font-bold text-primary underline-offset-4">Edit Global Script</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
