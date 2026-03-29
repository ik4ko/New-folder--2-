
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore, initializeStore } from "@/lib/store"
import { useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  CircleAlert, TrendingUp, Users, ShieldCheck, Printer, 
  Zap, PhoneCall, ArrowUpRight, Activity, Calendar, 
  Settings, Palette, Bell, ShieldAlert, Building2, Clock
} from "lucide-react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

export default function Dashboard() {
  const members = useAppStore((state) => state.members)

  useEffect(() => {
    initializeStore()
  }, [])

  const stats = useMemo(() => {
    const churnRisks = members.filter(m => m.status === 'churn-risk')
    const totalMembers = members.length
    const avgRetention = members.length > 0 
      ? Math.round(members.reduce((acc, m) => acc + (m.retentionScore || 0), 0) / members.length)
      : 0
    const pendingFaxes = members.filter(m => m.ssbciStatus === 'pending-fax').length
    const activeCalls = members.filter(m => m.checkInStatus === 'scheduled').length
    
    return {
      totalMembers,
      avgRetention,
      churnRisks: churnRisks.length,
      pendingFaxes,
      activeCalls
    }
  }, [members])

  const recentActivity = useMemo(() => {
    return [...members]
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 5)
  }, [members])

  const botTasks = useMemo(() => {
    const tasks = []
    
    const faxPending = members.filter(m => m.ssbciStatus === 'pending-fax').length
    if (faxPending > 0) tasks.push({ label: "Module 3: Chronic Fax", detail: `${faxPending} packages ready`, icon: Printer, color: "text-primary", status: "Queue" })
    
    const callsScheduled = members.filter(m => m.checkInStatus === 'scheduled').length
    if (callsScheduled > 0) tasks.push({ label: "Module 2: Maya Call", detail: `${callsScheduled} check-ins queued`, icon: PhoneCall, color: "text-secondary", status: "Active" })
    
    const riskAlerts = members.filter(m => m.status === 'churn-risk').length
    if (riskAlerts > 0) tasks.push({ label: "Module 1: MARx Sync", detail: `${riskAlerts} alerts detected`, icon: Activity, color: "text-destructive", status: "Alert" })
    
    return tasks.slice(0, 3)
  }, [members])

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background">
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
              CLAUDE 3.5: ACTIVE
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
              <div className="text-3xl font-black">{stats.totalMembers}</div>
              <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1 font-bold uppercase tracking-tight">
                <TrendingUp className="w-3 h-3" />
                Live Roster Connected
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-border bg-card rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avg. Retention Score</CardTitle>
              <ShieldCheck className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-black">{stats.avgRetention}%</div>
              <Progress value={stats.avgRetention} className="h-1.5 bg-muted" />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-destructive/20 bg-destructive/5 rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-destructive">Module 1 Alerts</CardTitle>
              <CircleAlert className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-destructive">{stats.churnRisks}</div>
              <p className="text-[10px] text-destructive/80 mt-1 font-black uppercase tracking-widest animate-pulse">
                Action Required (24h Window)
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border bg-card rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">SSBCI Fax Queue</CardTitle>
              <Printer className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">
                {stats.pendingFaxes}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-tight">
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
                    {recentActivity.map((member) => (
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

            <Card className="shadow-sm border-border bg-card rounded-3xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Settings className="w-4 h-4 text-primary" />
                  System Management
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" asChild className="h-20 flex-col gap-2 rounded-2xl border-primary/10 hover:bg-primary/5 hover:border-primary/30 transition-all group">
                    <Link href="/settings?tab=identity">
                      <Building2 className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Identity</span>
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="h-20 flex-col gap-2 rounded-2xl border-primary/10 hover:bg-primary/5 hover:border-primary/30 transition-all group">
                    <Link href="/settings?tab=branding">
                      <Palette className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Branding</span>
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="h-20 flex-col gap-2 rounded-2xl border-primary/10 hover:bg-primary/5 hover:border-primary/30 transition-all group">
                    <Link href="/settings?tab=alerts">
                      <Bell className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Alerts</span>
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="h-20 flex-col gap-2 rounded-2xl border-primary/10 hover:bg-primary/5 hover:border-primary/30 transition-all group">
                    <Link href="/settings?tab=compliance">
                      <ShieldAlert className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Compliance</span>
                    </Link>
                  </Button>
                </div>
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
                <div className="p-4 rounded-2xl bg-card border border-primary/10 text-[11px] leading-relaxed text-muted-foreground font-medium shadow-sm">
                  <span className="font-black text-primary uppercase text-[10px] block mb-1">Module 5: AEP SHIELD</span> 
                  {stats.churnRisks > 0 ? `${stats.churnRisks} high-risk members detected in current MARx poll. Triggering pre-emptive loyalty flows.` : "Roster fully protected. No disenrollment risks detected in latest snapshot."}
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 text-[11px] leading-relaxed text-emerald-700 font-medium shadow-sm">
                  <span className="font-black text-emerald-600 uppercase text-[10px] block mb-1">LIS BOT ANALYTICS</span> 
                  {members.filter(m => m.medicareMedicaidStatus === 'Medicare' || m.medicareMedicaidStatus === 'Both').length} members currently benefit from Extra Help. Scanning for gaps in Zip Code clusters.
                </div>
                <Button className="w-full text-[10px] h-10 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/20" asChild>
                  <Link href="/ai">
                    <Calendar className="w-3 h-3 mr-2" /> Launch Retention AI
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border bg-card rounded-3xl overflow-hidden">
              <CardHeader className="pb-2 bg-muted/20 border-b">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-foreground">Active Bot Task Queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {botTasks.length > 0 ? botTasks.map((act, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                        <act.icon className={`w-3.5 h-3.5 ${act.color}`} />
                      </div>
                      <div>
                        <p className="text-foreground font-bold">{act.label}</p>
                        <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">{act.detail}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1.5">{act.status}</Badge>
                  </div>
                )) : (
                  <div className="py-4 text-center text-muted-foreground italic text-[10px] font-bold uppercase tracking-widest">
                    All bots idle (100% Sync)
                  </div>
                )}
                {botTasks.length > 0 && (
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-medium pt-2 italic">
                    <Clock className="w-3 h-3" />
                    Last MARx polling: Just now
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
