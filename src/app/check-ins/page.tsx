"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  PhoneCall, Play, Headphones, MessageSquare, 
  TrendingUp, Sparkles, BrainCircuit, RefreshCw, 
  Settings2, Calendar, UserPlus, Search, 
  Mic2, AlertTriangle, CheckCircle2, History
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CheckInsPage() {
  const members = useAppStore((state) => state.members)
  const mayaSettings = useAppStore((state) => state.mayaSettings)
  const updateMayaSettings = useAppStore((state) => state.updateMayaSettings)
  const [search, setSearch] = useState("")
  
  const callLogs = useMemo(() => {
    return members
      .filter(m => m.checkInStatus === 'called' || m.checkInStatus === 'escalated' || m.checkInStatus === 'completed')
      .map(m => ({
        id: m.id,
        name: m.fullName,
        type: m.status === 'active' ? "Day 30" : "Retention Outreach",
        sentiment: m.lastCallSentiment || (m.retentionScore > 85 ? "Positive" : m.retentionScore > 60 ? "Neutral" : "Negative"),
        duration: "2:45",
        status: m.checkInStatus === 'escalated' ? "Escalated" : "Completed",
        transcript: m.lastCallTranscript || "Maya: Hi! How are you today? Member: I'm good, just checking on my dental coverage. Maya: Absolutely, I can help with that..."
      }))
  }, [members])

  const queue = useMemo(() => {
    return members.filter(m => m.checkInStatus === 'scheduled' && m.fullName.toLowerCase().includes(search.toLowerCase()))
  }, [members, search])

  const stats = useMemo(() => {
    const scheduled = members.filter(m => m.checkInStatus === 'scheduled').length
    const total = members.length || 1
    const escalated = members.filter(m => m.checkInStatus === 'escalated').length
    const escalationRate = Math.round((escalated / total) * 100)
    
    return {
      scheduled,
      escalationRate,
      completedCount: callLogs.length,
      sentimentIndex: 94 
    }
  }, [members, callLogs])

  const handleListen = (name: string) => {
    toast({ title: "Accessing HIPAA Vault", description: `Loading recording for ${name}...` })
  }

  const handleTriggerNow = (id: string) => {
    toast({ title: "Maya AI Triggered", description: "Outbound call initiated via Twilio Bridge." })
  }

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Maya AI: Member Check-ins</h1>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Autonomous Voice Outreach Engine</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 font-bold uppercase tracking-widest text-[10px]">TWILIO VOICE: ACTIVE</Badge>
            <Badge className="bg-primary/10 text-primary border-primary/20 px-3 font-bold uppercase tracking-widest text-[10px]">VOICE: {mayaSettings.voiceName.toUpperCase()}</Badge>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-slate-50/30 dark:bg-background">
          <div className="h-full flex flex-col md:flex-row">
            <div className="flex-1 flex flex-col border-r">
              <div className="p-8 space-y-8 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <Card className="rounded-3xl border-border bg-card shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Call Queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-black">{stats.scheduled}</div>
                      <p className="text-[10px] text-muted-foreground mt-1 font-bold">Autonomous Schedule: ON</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-3xl border-border bg-card shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Escalation Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-black text-amber-600">{stats.escalationRate}%</div>
                      <Progress value={stats.escalationRate} className="h-1.5 mt-2" />
                    </CardContent>
                  </Card>
                  <Card className="rounded-3xl border-border bg-card shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Conversations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-black text-primary">{stats.completedCount}</div>
                      <p className="text-[10px] text-muted-foreground mt-1 font-bold">Processed this period</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-3xl border-border bg-card shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sentiment Index</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-black text-emerald-600">{stats.sentimentIndex}%</div>
                      <p className="text-[10px] text-muted-foreground mt-1 font-bold">Positive response rate</p>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="history" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <TabsList className="bg-muted p-1 rounded-xl">
                      <TabsTrigger value="history" className="rounded-lg text-[10px] font-bold uppercase px-4">Call History</TabsTrigger>
                      <TabsTrigger value="queue" className="rounded-lg text-[10px] font-bold uppercase px-4">Pending Queue</TabsTrigger>
                    </TabsList>
                    <Button variant="outline" size="sm" className="rounded-xl h-8 text-[10px] font-bold uppercase tracking-widest">
                      <History className="w-3 h-3 mr-2" /> Clear Logs
                    </Button>
                  </div>

                  <TabsContent value="history" className="space-y-4 m-0">
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
                        <p className="text-muted-foreground font-bold">No active AI calls currently logged.</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="queue" className="space-y-4 m-0">
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search queue..." 
                        className="pl-9 rounded-xl h-10 bg-card border-border/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    {queue.length > 0 ? queue.map((member) => (
                      <div key={member.id} className="p-4 rounded-xl border bg-card flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                            <PhoneCall className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{member.fullName}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Trigger: Day 30 Check-in</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-[9px] font-bold uppercase">Scheduled</Badge>
                          <Button onClick={() => handleTriggerNow(member.id)} variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-bold border-primary/20 text-primary">
                            Trigger Manual Call
                          </Button>
                        </div>
                      </div>
                    )) : (
                      <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-card">
                        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <p className="text-muted-foreground font-bold">Queue is empty. Next batch runs tomorrow at 9:00 AM.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Maya Settings Panel */}
            <aside className="w-full md:w-80 p-8 space-y-8 bg-card border-l overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Maya Configuration</h3>
                </div>
                
                <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-none p-5 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest">Active Voice Profile</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant={mayaSettings.voiceName === 'Algenib' ? 'default' : 'outline'} 
                        size="sm" 
                        className="rounded-lg h-8 text-[9px] font-bold uppercase"
                        onClick={() => updateMayaSettings({ voiceName: 'Algenib' })}
                      >
                        Algenib (Female)
                      </Button>
                      <Button 
                        variant={mayaSettings.voiceName === 'Achernar' ? 'default' : 'outline'} 
                        size="sm" 
                        className="rounded-lg h-8 text-[9px] font-bold uppercase"
                        onClick={() => updateMayaSettings({ voiceName: 'Achernar' })}
                      >
                        Achernar (Male)
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest">Primary Script</label>
                    <textarea 
                      className="w-full min-h-[120px] rounded-xl border-primary/20 bg-white/50 p-3 text-[11px] leading-relaxed font-medium italic focus:ring-1 focus:ring-primary outline-none"
                      value={mayaSettings.script}
                      onChange={(e) => updateMayaSettings({ script: e.target.value })}
                    />
                  </div>

                  <Button className="w-full rounded-xl h-10 bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                    Save Global Script
                  </Button>
                </Card>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4 shadow-xl border border-white/10">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Mic2 className="w-4 h-4" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Live Whisper Mode</h4>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300 italic font-medium">
                  "Listening for keywords: provider switch, premium increase, AARP outreach, dissatisfaction."
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold uppercase tracking-tighter text-emerald-400">Real-time analysis active</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Strategic Impact</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-border bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Retention Lift</span>
                      <span className="text-[10px] font-black text-emerald-600">+12.4%</span>
                    </div>
                    <Progress value={85} className="h-1 bg-emerald-100" />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
                    Maya's proactive check-ins have prevented an estimated 14 disenrollments this quarter by identifying provider network concerns early.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
