
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore, initializeStore } from "@/lib/store"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Activity, Users, ShieldCheck, Printer, 
  Zap, ArrowUpRight, Sparkles, Banknote, Calendar, Info,
  BookOpen, Play, GraduationCap, Network, PhoneCall, Bot
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TutorialOverlay } from "@/components/tutorial-overlay"
import { useTranslation } from "@/lib/i18n"
import { RiskAlertFeed } from "@/components/risk-alert-feed"

export default function Dashboard() {
  const { members, startTutorial, language } = useAppStore()
  const { t } = useTranslation()
  const [filterHighRisk, setFilterHighRisk] = useState(false)

  useEffect(() => {
    initializeStore()
  }, [])

  const stats = useMemo(() => {
    const churnRisks = members.filter(m => m.status === 'churn-risk' || m.status === 'PROVISIONALLY_DISENROLLED' || m.status === 'PLAN_CHANGED')
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
    let filtered = [...members]
    if (filterHighRisk) {
      filtered = filtered.filter(m => m.status === 'churn-risk' || m.status === 'PROVISIONALLY_DISENROLLED' || m.status === 'PLAN_CHANGED')
    }
    return filtered
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 10)
  }, [members, filterHighRisk])

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <CollectionSidebar />
      <TutorialOverlay />
      
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <TooltipProvider delayDuration={0}>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-foreground uppercase">{t('dashboard.title')}</h1>
                <p className="text-muted-foreground font-black text-[10px] md:text-sm uppercase tracking-tight opacity-70">
                  {t('dashboard.subtitle')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 h-8 md:h-9 gap-2 font-black uppercase tracking-widest text-[8px] md:text-[9px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  HETS Live: Active
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 h-8 md:h-9 gap-2 font-black uppercase tracking-widest text-[8px] md:text-[9px]">
                  <Network className="w-3 h-3" />
                  Availity API: Connect
                </Badge>
              </div>
            </div>

            {/* Integrity Engine — Provisional Disenrollment Alert Feed */}
            <RiskAlertFeed />

            {/* Agent Heartbeat Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Agent 1: Switch Monitor', icon: Bot, status: 'Polling CMS', color: 'text-primary' },
                { name: 'Agent 2: Fax Automator', icon: Printer, status: 'Scanning Chronic', color: 'text-emerald-600' },
                { name: 'Agent 3: Maya AI Voice', icon: PhoneCall, status: 'Queue Ready', color: 'text-amber-600' }
              ].map((agent, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
                  <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${agent.color}`}>
                    <agent.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{agent.name}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold">{agent.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick-Start Academy */}
            <section className="p-1 rounded-[2.5rem] bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20">
              <div className="bg-background rounded-[2.4rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[2rem] bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 shrink-0">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Quick-Start Academy</h2>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide opacity-70">Master Medicare Registration & Retention in 5 minutes.</p>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <Button variant="outline" className="flex-1 md:flex-none h-12 rounded-2xl font-black uppercase text-[10px] border-primary/20 text-primary" onClick={() => startTutorial('enrollment')}>
                    <Play className="w-3.5 h-3.5 mr-2" /> Enrollment 101
                  </Button>
                  <Button className="flex-1 md:flex-none h-12 rounded-2xl font-black uppercase text-[10px] bg-primary hover:bg-primary/90 text-white shadow-lg" onClick={() => startTutorial('retention')}>
                    <Play className="w-3.5 h-3.5 mr-2" /> Retention 101
                  </Button>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/members" className="block">
                <Card className="bg-muted/30 border-none rounded-3xl p-5 flex flex-col justify-between min-h-[140px] shadow-sm hover:bg-muted/40 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('dashboard.bookOfBusiness')}</span>
                    <Users className="w-4 h-4 text-primary opacity-50 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-black mb-1 tracking-tighter">{stats.totalMembers}</div>
                    <div className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">+4% Growth</div>
                  </div>
                </Card>
              </Link>

              <Card className="bg-muted/30 border-none rounded-3xl p-5 flex flex-col justify-between min-h-[140px] shadow-sm cursor-default">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{t('dashboard.retentionScore')}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-500 opacity-50" />
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-black mb-1 tracking-tighter">{stats.avgRetention}%</div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-emerald-500" style={{ width: `${stats.avgRetention}%` }} />
                  </div>
                </div>
              </Card>

              <Link href="/members" className="block">
                <Card className="bg-muted/30 border-none rounded-3xl p-5 flex flex-col justify-between min-h-[140px] shadow-sm hover:bg-destructive/5 transition-colors cursor-pointer border border-transparent hover:border-destructive/20 group">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-widest text-destructive">{t('dashboard.switchAlerts')}</span>
                    <Activity className="w-4 h-4 text-destructive opacity-50 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-black text-destructive mb-1 tracking-tighter">{stats.churnRisks}</div>
                    <div className="text-[9px] font-black uppercase text-destructive tracking-widest">Action Required</div>
                  </div>
                </Card>
              </Link>

              <Link href="/fax" className="block">
                <Card className="bg-muted/30 border-none rounded-3xl p-5 flex flex-col justify-between min-h-[140px] shadow-sm hover:bg-muted/40 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('dashboard.pendingFaxes')}</span>
                    <Printer className="w-4 h-4 text-primary opacity-50 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-black mb-1 tracking-tighter">{stats.pendingFaxes}</div>
                    <div className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Ready to Send</div>
                  </div>
                </Card>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-lg font-black tracking-tight uppercase">Active Change Detection</h3>
                  <div className="flex items-center gap-4">
                    <Button 
                      variant={filterHighRisk ? "default" : "outline"}
                      onClick={() => setFilterHighRisk(!filterHighRisk)}
                      className="h-8 font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                      {filterHighRisk ? 'Showing High Risk' : 'Filter High Risk'}
                    </Button>
                    <Button variant="link" className="text-primary font-black text-[10px] uppercase tracking-widest h-auto p-0" asChild>
                      <Link href="/members">View Roster <ArrowUpRight className="ml-1 w-3 h-3" /></Link>
                    </Button>
                  </div>
                </div>
                <div className="rounded-3xl bg-muted/20 border-none overflow-x-auto shadow-inner">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-none hover:bg-transparent bg-transparent">
                        <TableHead className="font-black uppercase tracking-widest text-[9px] py-4 px-6 text-muted-foreground">Member</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[9px] text-muted-foreground">Last Update</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[9px] text-muted-foreground">Risk Level</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[9px] text-muted-foreground">Prot.</TableHead>
                        <TableHead className="text-right font-black uppercase tracking-widest text-[9px] px-6 text-muted-foreground">Act</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentActivity.map((member) => {
                        const isHighRisk = member.status === 'churn-risk' || member.status === 'PROVISIONALLY_DISENROLLED' || member.status === 'PLAN_CHANGED';
                        return (
                        <TableRow key={member.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                          <TableCell className="font-black py-4 px-6 text-foreground uppercase tracking-tight text-xs whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>{member.fullName || 'Member Record'}</span>
                              <span className="text-[8px] opacity-50 font-mono">{member.mbi_hash ? member.mbi_hash.slice(0, 10) + '...' : member.medicareId}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">
                            {member.updatedAt ? new Date(member.updatedAt).toLocaleTimeString() : (member.lastCmsCheck ? new Date(member.lastCmsCheck).toLocaleTimeString() : 'Never')}
                          </TableCell>
                          <TableCell>
                            {(member.riskProfile?.score ?? 0) > 50 ? (
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex flex-col gap-0.5 cursor-help w-fit">
                                      <Badge className="bg-red-500/20 text-red-500 border-red-500/30 rounded-md uppercase text-[8px] font-black px-2 py-0.5 animate-pulse">
                                        High Risk
                                      </Badge>
                                      <span className="text-[7px] text-red-400/80 font-bold leading-tight max-w-[130px]">
                                        Potential Benefit Incompatibility — Schedule Review
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest">
                                      Risk Score: {member.riskProfile?.score}/100
                                    </p>
                                    {member.riskProfile?.reasons.map((reason, i) => (
                                      <p key={i} className="text-[9px] opacity-80">• {reason}</p>
                                    ))}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : isHighRisk ? (
                              <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 rounded-md uppercase text-[8px] font-black px-2 py-0.5 animate-pulse">
                                High Risk
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 rounded-md uppercase text-[8px] font-black px-2 py-0.5">
                                Stable
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${member.retentionScore > 80 ? 'bg-emerald-500' : member.retentionScore > 50 ? 'bg-amber-500' : 'bg-destructive'}`} />
                              <span className="text-[10px] font-black">{member.retentionScore || 100}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-all" asChild>
                              <Link href={`/dashboard/members/${member.id}`}><ArrowUpRight className="w-3.5 h-3.5" /></Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

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
                        <ShieldCheck className="w-2.5 h-2.5" /> AEP Shield Check:
                      </div>
                      <p className="text-[10px] text-foreground leading-relaxed font-bold uppercase tracking-tight">
                        {members.filter(m => m.poaStatus === 'shielded').length} / {members.length} members protected via POA Shield.
                      </p>
                    </div>
                    
                    <div className="h-px bg-primary/10" />
                    
                    <div className="space-y-1.5">
                      <div className="text-[9px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-1.5">
                        <Calendar className="w-2.5 h-2.5" /> PTC Compliance:
                      </div>
                      <p className="text-[10px] text-foreground leading-relaxed font-bold uppercase tracking-tight">
                        {members.filter(m => {
                          const expiry = new Date(m.ptcExpiryDate);
                          const thirtyDaysFromNow = new Date();
                          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                          return expiry < thirtyDaysFromNow;
                        }).length} members need PTC renewal this month.
                      </p>
                    </div>
                  </Card>

                  <Button className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-[10px]" asChild>
                    <Link href="/ai">Run Strategy Agent</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
}
