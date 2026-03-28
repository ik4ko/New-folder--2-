
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PhoneCall, Play, Headphones, MessageSquare, TrendingUp, AlertTriangle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function CheckInsPage() {
  const members = useAppStore((state) => state.members)
  
  const callLogs = [
    { name: "Robert Miller", type: "Day 7", sentiment: "Neutral", duration: "2:14", status: "Escalated" },
    { name: "Alice Johnson", type: "Day 30", sentiment: "Positive", duration: "1:45", status: "Completed" },
    { name: "Maria Rodriguez", type: "Day 7", sentiment: "Positive", duration: "3:10", status: "Completed" },
  ]

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
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3">TWILIO VOICE: ACTIVE</Badge>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Today's Call Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">12</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold">8 Scheduled, 4 Pending</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Escalation Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-amber-600">8%</div>
                <Progress value={8} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Total Talk Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-primary">142m</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold">Avg 2.4m / call</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground">Sentiment Index</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-600">92%</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold">Positive/Neutral response</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Recent AI Conversations
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {callLogs.map((log, i) => (
                <div key={i} className="group p-5 rounded-2xl border bg-card hover:border-primary/30 transition-all flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{log.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5">{log.type}</Badge>
                        <span className="text-[10px] text-muted-foreground font-medium">Duration: {log.duration}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Sentiment</p>
                      <Badge variant={log.sentiment === 'Positive' ? 'secondary' : 'outline'} className="text-[10px] rounded-lg">
                        {log.sentiment}
                      </Badge>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Status</p>
                      <span className={`text-[10px] font-black uppercase ${log.status === 'Escalated' ? 'text-destructive' : 'text-emerald-600'}`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="outline" size="icon" className="rounded-xl h-9 w-9 border-primary/20 text-primary">
                        <Play className="w-4 h-4 fill-primary" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold">Maya AI script updated</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                "Hi, this is Maya calling from the MediStay enrollment team. We noticed your plan confirmed yesterday and wanted to ensure your provider network is working as expected..."
              </p>
              <Button variant="link" className="text-xs font-bold text-primary underline-offset-4">Edit Call Script</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
