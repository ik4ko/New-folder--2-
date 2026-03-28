
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore, initializeStore } from "@/lib/store"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, TrendingUp, Users, ShieldCheck, Printer, Zap, PhoneCall, ArrowUpRight } from "lucide-react"
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
      
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Retention Command Center</h1>
            <p className="text-muted-foreground mt-1">Autonomous Medicare Monitoring & Member Protection</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 border border-green-500/20 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              CMS MARx: Active
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold">
              <Zap className="w-3 h-3" />
              GHL Sync: Enabled
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Book of Business</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalMembers}</div>
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1 font-medium">
                <TrendingUp className="w-3 h-3" />
                +4% growth this month
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Retention Score</CardTitle>
              <ShieldCheck className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold">{avgRetention}%</div>
              <Progress value={avgRetention} className="h-1.5 bg-muted" />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-destructive/20 bg-destructive/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-destructive">CMS Switch Alerts</CardTitle>
              <AlertCircle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{churnRisks.length}</div>
              <p className="text-xs text-destructive/80 mt-1 font-medium uppercase tracking-wider">
                Action Required (24h Window)
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending SSBCI Faxes</CardTitle>
              <Printer className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {members.filter(m => m.ssbciStatus === 'pending-fax').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-generation active
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm border-border bg-card overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">Active Change Detection</CardTitle>
                  <Button variant="ghost" size="sm" asChild className="text-primary font-semibold text-xs hover:text-primary/80">
                    <Link href="/members">View All <ArrowUpRight className="w-3 h-3 ml-1" /></Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold text-muted-foreground">Member</TableHead>
                      <TableHead className="font-semibold text-muted-foreground">Current Carrier</TableHead>
                      <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
                      <TableHead className="font-semibold text-muted-foreground">Protection</TableHead>
                      <TableHead className="text-right font-semibold text-muted-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id} className="hover:bg-primary/5 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{member.fullName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{member.medicareId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-foreground/80 font-medium">{member.carrier}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={member.status === 'churn-risk' ? 'destructive' : 'secondary'} 
                            className="rounded-md uppercase text-[9px] px-2 py-0"
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${member.retentionScore > 80 ? 'bg-green-500' : member.retentionScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                            <span className="text-xs font-bold text-foreground/80">{member.retentionScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild className="h-7 text-[10px] font-bold border-primary/20 text-primary hover:bg-primary/5">
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
            <Card className="shadow-sm border-primary/10 bg-card relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap className="w-24 h-24 text-primary" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Retention AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-bold text-primary">AEP Shield Ready:</span> September pre-emptive campaign is scheduled for {totalMembers} members. High-risk segments identified based on market volatility.
                </div>
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-bold text-green-600">LIS Opportunity:</span> {members.filter(m => m.medicareMedicaidStatus === 'Medicare').length} members likely eligible for Extra Help based on age/location signals.
                </div>
                <Button className="w-full text-[10px] h-8 font-bold bg-primary hover:bg-primary/90">
                  <PhoneCall className="w-3 h-3 mr-2" /> Run AI Health Checks
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-foreground">Bot Activity Log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "CMS Snapshot Polled", time: "2h ago", icon: ShieldCheck, color: "text-green-600" },
                  { label: "SSBCI Fax Auto-Sent", time: "4h ago", icon: Printer, color: "text-primary" },
                  { label: "GHL Contact Sync", time: "15m ago", icon: Zap, color: "text-orange-600" }
                ].map((act, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <act.icon className={`w-3 h-3 ${act.color}`} />
                      {act.label}
                    </div>
                    <span className="font-mono text-muted-foreground/60">{act.time}</span>
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
