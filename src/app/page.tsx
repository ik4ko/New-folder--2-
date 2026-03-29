"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore, initializeStore } from "@/lib/store"
import { useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Activity, Users, ShieldCheck, Printer, 
  Zap, ArrowUpRight, Sparkles, Banknote, Calendar
} from "lucide-react"
import Link from "next/link"
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
        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <h1 className="text-4xl font-black tracking-tight text-foreground uppercase">Retention Command Center</h1>
              <p className="text-muted-foreground font-black text-lg max-w-2xl uppercase tracking-tight opacity-70">
                Autonomous Medicare Monitoring & Member Protection
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-4 py-1.5 h-10 gap-2 font-black uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                CMS MARx: Active
              </Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 h-10 gap-2 font-black uppercase tracking-widest">
                <Zap className="w-3.5 h-3.5" />
                GHL Sync: Enabled
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Stats Cards */}
            <Card className="bg-muted/30 border-none rounded-[2rem] p-6 flex flex-col justify-between min-h-[200px] shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Book of <br />Business</span>
                <Users className="w-5 h-5 text-primary opacity-50" />
              </div>
              <div>
                <div className="text-5xl font-black mb-2 tracking-tighter">{stats.totalMembers}</div>
                <div className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">+4% growth this month</div>
              </div>
            </Card>

            <Card className="bg-muted/30 border-none rounded-[2rem] p-6 flex flex-col justify-between min-h-[200px] shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Avg <br />Retention Score</span>
                <ShieldCheck className="w-5 h-5 text-emerald-500 opacity-50" />
              </div>
              <div>
                <div className="text-5xl font-black mb-2 tracking-tighter">{stats.avgRetention}%</div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-4">
                  <div className="h-full bg-emerald-500" style={{ width: `${stats.avgRetention}%` }} />
                </div>
              </div>
            </Card>

            <Card className="bg-muted/30 border-none rounded-[2rem] p-6 flex flex-col justify-between min-h-[200px] shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-black uppercase tracking-widest text-destructive">CMS <br />Switch Alerts</span>
                <Activity className="w-5 h-5 text-destructive opacity-50" />
              </div>
              <div>
                <div className="text-5xl font-black text-destructive mb-2 tracking-tighter">{stats.churnRisks}</div>
                <div className="text-[10px] font-black uppercase text-destructive tracking-widest">Action Required (24h Window)</div>
              </div>
            </Card>

            <Card className="bg-muted/30 border-none rounded-[2rem] p-6 flex flex-col justify-between min-h-[200px] shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pending <br />SSBCI Faxes</span>
                <Printer className="w-5 h-5 text-primary opacity-50" />
              </div>
              <div>
                <div className="text-5xl font-black mb-2 tracking-tighter">{stats.pendingFaxes}</div>
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Auto-generation active</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Change Detection Table */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-end justify-between px-2">
                <h3 className="text-2xl font-black tracking-tight uppercase">Active Change Detection</h3>
                <Button variant="link" className="text-primary font-black text-xs uppercase tracking-widest h-auto p-0" asChild>
                  <Link href="/members">View All <ArrowUpRight className="ml-1 w-4 h-4" /></Link>
                </Button>
              </div>
              <div className="rounded-[2rem] bg-muted/20 border-none overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-none hover:bg-transparent bg-transparent">
                      <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-8 text-muted-foreground">Member</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Current Carrier</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Status</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Protection</TableHead>
                      <TableHead className="text-right font-black uppercase tracking-widest text-[10px] px-8 text-muted-foreground">Act</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivity.map((member) => (
                      <TableRow key={member.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-black py-5 px-8 text-foreground uppercase tracking-tight">{member.fullName}</TableCell>
                        <TableCell className="text-xs font-bold text-muted-foreground uppercase">{member.carrier}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={member.status === 'churn-risk' ? 'destructive' : 'outline'} 
                            className="rounded-md uppercase text-[9px] font-black px-2 py-0.5"
                          >
                            {member.status === 'churn-risk' ? 'Switch Detected' : 'Shielded'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${member.retentionScore > 80 ? 'bg-emerald-500' : member.retentionScore > 50 ? 'bg-amber-500' : 'bg-destructive'}`} />
                            <span className="text-xs font-black">{member.retentionScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all" asChild>
                            <Link href={`/members/${member.id}`}><ArrowUpRight className="w-4 h-4" /></Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* AI Insights Sidebar */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black tracking-tight text-foreground uppercase leading-none">Retention AI <br /><span className="text-primary">Insights</span></h3>
              </div>
              
              <div className="space-y-4">
                <Card className="bg-primary/5 border border-primary/10 rounded-[2rem] p-8 space-y-6">
                  <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3" /> AEP Shield Ready:
                    </div>
                    <p className="text-[11px] text-foreground leading-relaxed font-bold uppercase tracking-tight">
                      September campaign scheduled for {stats.totalMembers} members. High-risk segments detected.
                    </p>
                  </div>
                  <div className="h-px bg-primary/10" />
                  <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-2">
                      <Banknote className="w-3 h-3" /> LIS Opportunity:
                    </div>
                    <p className="text-[11px] text-foreground leading-relaxed font-bold uppercase tracking-tight">
                      {members.filter(m => m.medicareMedicaidStatus === 'Medicare').length} members likely eligible for Extra Help based on local income markers.
                    </p>
                  </div>
                </Card>

                <Button className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-xs" asChild>
                  <Link href="/ai">Run Strategy Agent</Link>
                </Button>

                <div className="p-6 rounded-2xl border border-border bg-card flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Next Compliance Audit</p>
                      <p className="text-xs font-black text-foreground uppercase tracking-tight">Oct 12, 2025</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}