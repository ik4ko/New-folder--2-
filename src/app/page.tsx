"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore, initializeStore } from "@/lib/store"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, TrendingUp, Users, ShieldCheck, Printer, Zap, PhoneCall, ArrowUpRight, Activity, Calendar, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

export default function Dashboard() {
  const members = useAppStore((state) => state.members)

  useEffect(() => {
    initializeStore()
  }, [])

  const churnRisks = members.filter(m => m.status === 'churn-risk')
  const totalMembers = members.length
  const avgRetention = members.length > 0 
    ? Math.round(members.reduce((acc, m) => acc + m.retentionScore, 0) / members.length)
    : 0

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#F7F4F0]/30 dark:bg-background">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Retention Command Center</h1>
            <p className="text-muted-foreground mt-1 font-medium italic">Autonomous Medicare Monitoring & Member Protection</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              CMS MARx: ONLINE
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Zap className="w-3 h-3" />
              CLAUDE: ACTIVE
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-sm border-border bg-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Book of Business</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{totalMembers}</div>
              <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1 font-bold">
                <TrendingUp className="w-3 h-3" />
                +4% growth this month
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-border bg-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Retention Score</CardTitle>
              <ShieldCheck className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-black">{avgRetention}%</div>
              <Progress value={avgRetention} className="h-1.5 bg-muted" />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-destructive/20 bg-destructive/5 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-destructive">Module 1 Alerts</CardTitle>
              <AlertCircle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-destructive">{churnRisks.length}</div>
              <p className="text-[10px] text-destructive/80 mt-1 font-black uppercase tracking-widest">
                Action Required (24h)
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border bg-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending Faxes</CardTitle>
              <Printer className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">
                {members.filter(m => m.ssbciStatus === 'pending-fax').length}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 font-bold">
                Module 3: Auto-gen active
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-border bg-card overflow-hidden rounded-2xl">
              <CardHeader className="bg-muted/30 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Autonomous Monitoring Queue
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild className="text-primary font-bold text-[10px] uppercase tracking-widest hover:bg-primary/5">
                    <Link href="/members">Full Roster <ArrowUpRight className="w-3 h-3 ml-1" /></Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-10 px-6">Member</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-10">Carrier</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-10">Module 1</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-10">Score</TableHead>
                      <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-10 px-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id} className="hover:bg-primary/5 transition-colors border-border/50">
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-sm">{member.fullName}</span>
                            <span className="text-[9px] text-muted-foreground font-mono">{member.medicareId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-foreground/80 font-bold">{member.carrier}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={member.status === 'churn-risk' ? 'destructive' : 'secondary'} 
                            className="rounded-md uppercase text-[8px] px-2 py-0.5"
                          >
                            {member.status === 'churn-risk' ? 'Switch Detected' : 'Shielded'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${member.retentionScore > 80 ? 'bg-emerald-500' : member.retentionScore > 50 ? 'bg-amber-500' : 'bg-destructive'}`} />
                            <span className="text-[10px] font-black text-foreground/80">{member.retentionScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <Button variant="outline" size="sm" asChild className="h-7 text-[9px] font-black uppercase tracking-tighter border-primary/20 text-primary hover:bg-primary/5 rounded-lg">
                            <Link href={`/members/${member.id}`}>Details</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-sm border-primary/20 bg-card relative overflow-hidden group rounded-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap className="w-24 h-24 text-primary" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  MediStay AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-[11px] leading-relaxed text-muted-foreground font-medium">
                  <span className="font-black text-primary uppercase text-[10px] mr-2">Module 5:</span> AEP Shield is ready for deployment. September pre-emptive campaign is scheduled for {totalMembers} members.
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-[11px] leading-relaxed text-muted-foreground font-medium">
                  <span className="font-black text-emerald-600 uppercase text-[10px] mr-2">LIS BOT:</span> {members.filter(m => m.medicareMedicaidStatus === 'Medicare').length} members likely eligible for Extra Help based on age/location signals.
                </div>
                <Button className="w-full text-[10px] h-9 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20">
                  <Calendar className="w-3 h-3 mr-2" /> Launch AEP Shield
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border bg-card rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-foreground">Bot Task Queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Module 1 Poll (MARx)", time: "2h ago", icon: ShieldCheck, color: "text-emerald-600" },
                  { label: "Module 3 SSBCI Fax", time: "4h ago", icon: Printer, color: "text-primary" },
                  { label: "Module 2 AI Call (Maya)", time: "15m ago", icon: PhoneCall, color: "text-secondary" }
                ].map((act, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                      <act.icon className={`w-3.5 h-3.5 ${act.color}`} />
                      {act.label}
                    </div>
                    <span className="font-mono text-muted-foreground/60 text-[9px]">{act.time}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}