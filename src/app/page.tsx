
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore, initializeStore } from "@/lib/store"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CircleAlert, TrendingUp, Users, ShieldCheck, Printer, Zap, PhoneCall, ArrowUpRight, Activity, Calendar, ShieldAlert } from "lucide-react"
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
              SONNET 3.5: ACTIVE
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-sm border-border bg-card rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Book of Business</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{totalMembers}</div>
              <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1 font-bold">
                <TrendingUp className="w-3 h-3" />
                +4.2% growth (30d)
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-border bg-card rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avg. Retention Score</CardTitle>
              <ShieldCheck className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-black">{avgRetention}%</div>
              <Progress value={avgRetention} className="h-1.5 bg-muted" />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-destructive/20 bg-destructive/5 rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-destructive">Module 1 Alerts</CardTitle>
              <CircleAlert className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-destructive">{churnRisks.length}</div>
              <p className="text-[10px] text-destructive/80 mt-1 font-black uppercase tracking-widest animate-pulse">
                Action Required (24h Window)
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border bg-card rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending Faxes</CardTitle>
              <Printer className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">
                {members.filter(m => m.ssbciStatus === 'pending-fax').length}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 font-bold">
                Module 3: chronic SNPs
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-border bg-card overflow-hidden rounded-3xl">
              <CardHeader className="bg-muted/30 border-b border-border py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Activity className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      Autonomous Monitoring Queue
                    </CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="text-primary font-bold text-[10px] uppercase tracking-widest hover:bg-primary/5">
                    <Link href="/members">View Full Roster <ArrowUpRight className="w-3 h-3 ml-1" /></Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-none">
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-10 px-6">Member</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-10">Active Plan</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-10 text-center">Module 1</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-10 text-center">Health</TableHead>
                      <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest text-muted-foreground h-10 px-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.slice(0, 5).map((member) => (
                      <TableRow key={member.id} className="hover:bg-primary/5 transition-colors border-border/50">
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-sm">{member.fullName}</span>
                            <span className="text-[9px] text-muted-foreground font-mono uppercase">{member.medicareId}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-[11px] text-foreground/80 font-bold">{member.carrier}</span>
                            <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">{member.planName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={member.status === 'churn-risk' ? 'destructive' : 'secondary'} 
                            className="rounded-md uppercase text-[8px] px-2 py-0.5"
                          >
                            {member.status === 'churn-risk' ? 'Switch Detected' : 'Shielded'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${member.retentionScore > 80 ? 'bg-emerald-500' : member.retentionScore > 50 ? 'bg-amber-500' : 'bg-destructive'}`} />
                            <span className="text-[10px] font-black text-foreground/80">{member.retentionScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <Button variant="outline" size="sm" asChild className="h-7 px-3 text-[9px] font-black uppercase tracking-tighter border-primary/20 text-primary hover:bg-primary/5 rounded-xl transition-all">
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
            <Card className="shadow-sm border-primary/20 bg-primary/5 relative overflow-hidden group rounded-3xl border-none">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-24 h-24 text-primary" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  MediStay AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/80 dark:bg-card/80 border border-primary/10 text-[11px] leading-relaxed text-muted-foreground font-medium shadow-sm">
                  <span className="font-black text-primary uppercase text-[10px] block mb-1">Module 5: AEP SHIELD</span> 
                  September pre-emptive loyalty campaign is ready. Predicted disenrollment spike in ZIP 94103.
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 text-[11px] leading-relaxed text-emerald-700 font-medium shadow-sm">
                  <span className="font-black text-emerald-600 uppercase text-[10px] block mb-1">LIS BOT ANALYTICS</span> 
                  {members.filter(m => m.medicareMedicaidStatus === 'Medicare').length} members likely eligible for Extra Help based on local asset markers.
                </div>
                <Button className="w-full text-[10px] h-10 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/20">
                  <Calendar className="w-3 h-3 mr-2" /> Launch AEP Shield
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border bg-card rounded-3xl overflow-hidden">
              <CardHeader className="pb-2 bg-muted/20 border-b">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-foreground">Active Bot Task Queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {[
                  { label: "Module 1: MARx Sync", time: "12m ago", icon: Activity, color: "text-blue-600", status: "Success" },
                  { label: "Module 3: Chronic Fax", time: "4h ago", icon: Printer, color: "text-primary", status: "Sent" },
                  { label: "Module 2: Maya Call", time: "1h ago", icon: PhoneCall, color: "text-secondary", status: "Completed" }
                ].map((act, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                        <act.icon className={`w-3.5 h-3.5 ${act.color}`} />
                      </div>
                      <div>
                        <p className="text-foreground font-bold">{act.label}</p>
                        <p className="text-[9px] text-muted-foreground font-mono">{act.time}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1.5">{act.status}</Badge>
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
