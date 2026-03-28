"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore, initializeStore } from "@/lib/store"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, TrendingUp, Users, Calendar, ArrowUpRight, ShieldCheck, Printer, Zap } from "lucide-react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"

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
    <div className="flex h-full w-full">
      <CollectionSidebar />
      
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-headline font-semibold text-primary">Retention Command Center</h1>
            <p className="text-muted-foreground mt-1">Autonomous Medicare monitoring & proactive engagement</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="h-8 px-4 text-green-600 bg-green-50 border-green-200 rounded-full font-semibold">
              CMS Watch: Active
            </Badge>
            <Badge variant="outline" className="h-8 px-4 text-primary bg-primary/5 border-primary/20 rounded-full font-semibold">
              GHL Sync: Enabled
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Book of Business</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMembers}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                +4% growth this month
              </p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Retention Score</CardTitle>
              <ShieldCheck className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold">{avgRetention}%</div>
              <Progress value={avgRetention} className="h-1" />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-sm bg-card border-l-4 border-l-destructive">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">CMS Switch Alerts</CardTitle>
              <AlertCircle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{churnRisks.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Detected via Agent 1 (MARx/Emails)
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">SSBCI Fax Pending</CardTitle>
              <Printer className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter(m => m.ssbciStatus === 'pending-fax').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Chronic care auto-generation
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="bg-sidebar-accent/30 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-headline font-semibold text-primary">Active Change Detection</CardTitle>
                  <Link href="/members" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                    View full roster <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[200px]">Member</TableHead>
                      <TableHead>Current Carrier</TableHead>
                      <TableHead>CMS Status</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.slice(0, 5).map((member) => (
                      <TableRow key={member.id} className="hover:bg-sidebar-accent/10">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{member.fullName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{member.medicareId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{member.carrier}</TableCell>
                        <TableCell>
                          <Badge variant={member.status === 'churn-risk' ? 'destructive' : 'secondary'} className="rounded-md uppercase text-[10px]">
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{member.retentionScore}%</span>
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${member.retentionScore}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/members/${member.id}`} className="text-primary hover:underline text-xs font-semibold">
                            Intervene
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl border-border/60 shadow-sm ai-shimmer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent" />
                  Retention AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-xl bg-white/80 border border-primary/10">
                  <p className="text-[11px] leading-relaxed text-foreground/80">
                    <span className="font-bold">AEP Shield Ready:</span> September pre-emptive campaign is scheduled for 1,200 members. High-risk segments identified based on carrier exits.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/80 border border-primary/10">
                  <p className="text-[11px] leading-relaxed text-foreground/80">
                    <span className="font-bold">LIS Opportunity:</span> 12 members likely eligible for Extra Help based on dual-status signals. $5,700/yr avg value to beneficiary.
                  </p>
                </div>
                <Button variant="outline" className="w-full text-xs h-8 rounded-lg border-primary text-primary hover:bg-primary/5">
                  Generate Risk Analysis
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Bot Activity (24h)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "CMS Snapshot Polled", time: "2h ago", icon: ShieldCheck },
                  { label: "SSBCI Fax Auto-Sent", time: "4h ago", icon: Printer },
                  { label: "GHL Contact Sync", time: "15m ago", icon: Zap }
                ].map((act, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <act.icon className="w-3 h-3" />
                      {act.label}
                    </div>
                    <span className="font-mono text-primary">{act.time}</span>
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
