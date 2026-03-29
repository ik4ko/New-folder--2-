"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore, initializeStore } from "@/lib/store"
import { useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Activity, Users, ShieldCheck, Printer, 
  Zap, ArrowUpRight, Sparkles, Banknote, Calendar, Info
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
    
    return {
      totalMembers,
      avgRetention,
      churnRisks: churnRisks.length,
      pendingFaxes
    }
  }, [members])

  const recentActivity = useMemo(() => {
    return [...members]
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 5)
  }, [members])

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <TooltipProvider delayDuration={0}>
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground uppercase">Retention Command Center</h1>
                <p className="text-muted-foreground font-black text-sm uppercase tracking-tight opacity-70">
                  Autonomous Medicare Monitoring & Member Protection
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 h-9 gap-2 font-black uppercase tracking-widest cursor-help text-[9px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      CMS MARx: Active
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Direct Bridge to Medicare Enrollment Database</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 h-9 gap-2 font-black uppercase tracking-widest cursor-help text-[9px]">
                      <Zap className="w-3 h-3" />
                      GHL Sync: Live
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>GoHighLevel CRM Bi-Directional Synchronization</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Stats Cards */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/members" className="block">
                    <Card className="bg-muted/30 border-none rounded-3xl p-5 flex flex-col justify-between min-h-[160px] shadow-sm hover:bg-muted/40 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Book of <br />Business</span>
                        <Users className="w-4 h-4 text-primary opacity-50 group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <div className="text-4xl font-black mb-1 tracking-tighter">{stats.totalMembers}</div>
                        <div className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">+4% Growth</div>
                      </div>
                    </Card>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>View Full Member Roster</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="bg-muted/30 border-none rounded-3xl p-5 flex flex-col justify-between min-h-[160px] shadow-sm hover:bg-muted/40 transition-colors cursor-default">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Avg <br />Retention Score</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-500 opacity-50" />
                    </div>
                    <div>
                      <div className="text-4xl font-black mb-1 tracking-tighter">{stats.avgRetention}%</div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden mt-3">
                        <div className="h-full bg-emerald-500" style={{ width: `${stats.avgRetention}%` }} />
                      </div>
                    </div>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>AI-Calculated Member Stability Index</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/members" className="block">
                    <Card className="bg-muted/30 border-none rounded-3xl p-5 flex flex-col justify-between min-h-[160px] shadow-sm hover:bg-destructive/5 transition-colors cursor-pointer border border-transparent hover:border-destructive/20 group">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest text-destructive">CMS <br />Switch Alerts</span>
                        <Activity className="w-4 h-4 text-destructive opacity-50 group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <div className="text-4xl font-black text-destructive mb-1 tracking-tighter">{stats.churnRisks}</div>
                        <div className="text-[9px] font-black uppercase text-destructive tracking-widest">Action Required</div>
                      </div>
                    </Card>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Address High-Risk Disenrollment Events</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/fax" className="block">
                    <Card className="bg-muted/30 border-none rounded-3xl p-5 flex flex-col justify-between min-h-[160px] shadow-sm hover:bg-muted/40 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending <br />SSBCI Faxes</span>
                        <Printer className="w-4 h-4 text-primary opacity-50 group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <div className="text-4xl font-black mb-1 tracking-tighter">{stats.pendingFaxes}</div>
                        <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Ready to Send</div>
                      </div>
                    </Card>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Manage Chronic care Verification Packages</TooltipContent>
              </Tooltip>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Change Detection Table */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black tracking-tight uppercase">Active Change Detection</h3>
                    <Tooltip>
                      <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground/50" /></TooltipTrigger>
                      <TooltipContent>Live Polling Data from CMS MARx Snapshots</TooltipContent>
                    </Tooltip>
                  </div>
                  <Button variant="link" className="text-primary font-black text-[10px] uppercase tracking-widest h-auto p-0" asChild>
                    <Link href="/members">View Roster <ArrowUpRight className="ml-1 w-3 h-3" /></Link>
                  </Button>
                </div>
                <div className="rounded-3xl bg-muted/20 border-none overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-none hover:bg-transparent bg-transparent">
                        <TableHead className="font-black uppercase tracking-widest text-[9px] py-4 px-6 text-muted-foreground">Member</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[9px] text-muted-foreground">Carrier</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[9px] text-muted-foreground">Status</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[9px] text-muted-foreground">Prot.</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-[9px] px-6 text-muted-foreground">Act</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentActivity.map((member) => (
                        <TableRow key={member.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                          <TableCell className="font-black py-4 px-6 text-foreground uppercase tracking-tight text-xs">{member.fullName}</TableCell>
                          <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{member.carrier}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={member.status === 'churn-risk' ? 'destructive' : 'outline'} 
                              className="rounded-md uppercase text-[8px] font-black px-1.5 py-0"
                            >
                              {member.status === 'churn-risk' ? 'Switch' : 'Safe'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${member.retentionScore > 80 ? 'bg-emerald-500' : member.retentionScore > 50 ? 'bg-amber-500' : 'bg-destructive'}`} />
                              <span className="text-[10px] font-black">{member.retentionScore}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all" asChild>
                              <Link href={`/members/${member.id}`}><ArrowUpRight className="w-3.5 h-3.5" /></Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* AI Insights Sidebar */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-md font-black tracking-tight text-foreground uppercase leading-none">Retention AI <br /><span className="text-primary text-[10px] tracking-widest">Insights</span></h3>
                </div>
                
                <div className="space-y-3">
                  <Card className="bg-primary/5 border border-primary/10 rounded-3xl p-6 space-y-4">
                    <div className="space-y-1.5">
                      <div className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> AEP Shield Ready:
                      </div>
                      <p className="text-[10px] text-foreground leading-relaxed font-bold uppercase tracking-tight">
                        September campaign scheduled for {stats.totalMembers} members. High-risk isolated.
                      </p>
                    </div>
                    
                    <div className="h-px bg-primary/10" />
                    
                    <div className="space-y-1.5">
                      <div className="text-[9px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-1.5">
                        <Banknote className="w-2.5 h-2.5" /> LIS Opportunity:
                      </div>
                      <p className="text-[10px] text-foreground leading-relaxed font-bold uppercase tracking-tight">
                        {members.filter(m => m.medicareMedicaidStatus === 'Medicare').length} members likely eligible for Extra Help.
                      </p>
                    </div>
                  </Card>

                  <Button className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-[10px]" asChild>
                    <Link href="/ai">Run Strategy Agent</Link>
                  </Button>

                  <Link href="/settings?tab=compliance" className="block">
                    <div className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Next Audit</p>
                          <p className="text-[10px] font-black text-foreground uppercase tracking-tight">Oct 12, 2025</p>
                        </div>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-all" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
}
