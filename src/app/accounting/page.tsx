
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Banknote, TrendingUp, DollarSign, 
  Download, CreditCard, PieChart, ShieldAlert, 
  UserCircle, ArrowUpRight
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { useMemo } from "react"
import { useRouter } from "next/navigation"

export default function AccountingPage() {
  const router = useRouter()
  const { ledger, members, agencyProfile, brokers } = useAppStore()

  const stats = useMemo(() => {
    const totalPaid = ledger.filter(t => t.status === 'paid').reduce((acc, t) => acc + t.amount, 0)
    const pending = ledger.filter(t => t.status === 'pending').reduce((acc, t) => acc + t.amount, 0)
    
    // Medicare Economics simulation: $600/yr per member commission
    const bookValue = members.length * 600
    const churnRiskValue = members.filter(m => m.status === 'churn-risk').length * 600
    
    return {
      totalPaid,
      pending,
      bookValue,
      churnRiskValue,
      retentionROI: 92
    }
  }, [ledger, members])

  const handleAction = (title: string, desc: string) => {
    toast({ title, description: desc })
  }

  const navigateToBilling = () => {
    router.push('/settings/billing')
  }

  const getPlanCost = () => {
    switch (agencyProfile.billingPlan) {
      case 'entry': return '99'
      case 'starter': return '299'
      case 'pro': return '499'
      case 'enterprise': return '1499'
      default: return '0'
    }
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground uppercase tracking-tight">Agency Accounting</h1>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic opacity-70">Commissions & SaaS Billing</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-2xl h-10 text-xs font-black uppercase tracking-widest border-border" onClick={() => handleAction("Exporting Ledger", "Generating encrypted financial CSV...")}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button className="rounded-2xl h-10 text-xs font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" onClick={navigateToBilling}>
              <CreditCard className="w-4 h-4 mr-2" /> Manage Plan
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-12 pb-32">
          {/* Economic Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
            <Card className="rounded-3xl border-none shadow-sm bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest">Total Book Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-primary">${stats.bookValue.toLocaleString()}</div>
                <p className="text-[10px] text-primary/70 mt-1 font-bold italic">Annualized Estimate</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm bg-card border border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pending Commissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-foreground">${stats.pending.toLocaleString()}</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold">Awaiting Carrier Sync</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-destructive tracking-widest">At-Risk Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-destructive">-${stats.churnRiskValue.toLocaleString()}</div>
                <p className="text-[10px] text-destructive/70 mt-1 font-bold uppercase tracking-tighter">Projected Churn Loss</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm bg-card border border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">SaaS Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-foreground">
                  ${getPlanCost()}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-tight">{agencyProfile.billingPlan.toUpperCase()} Plan (Monthly)</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Section 01: Transaction Ledger */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight text-foreground">01. Commission Ledger</h2>
                    <p className="text-xs text-muted-foreground font-bold">Immutable history of member-driven agency revenue.</p>
                  </div>
                  <Badge variant="outline" className="font-black border-primary/20 text-primary uppercase text-[9px] tracking-widest bg-primary/5">Live Sync: AGA / Clover</Badge>
                </div>

                <Card className="rounded-3xl border border-border shadow-sm bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30 border-none">
                        <TableHead className="font-black text-[10px] uppercase tracking-widest px-8">Beneficiary</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Date</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Type</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Amount</TableHead>
                        <TableHead className="text-right font-black text-[10px] uppercase tracking-widest px-8">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.length > 0 ? ledger.map((tx) => (
                        <TableRow key={tx.id} className="border-border/50 hover:bg-slate-50/50">
                          <TableCell className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="font-black text-foreground text-sm">{tx.memberName}</span>
                              <span className="text-[9px] text-muted-foreground font-mono font-bold uppercase">ID: {tx.memberId}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] font-black text-foreground">{tx.date}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[9px] uppercase font-black tracking-widest px-2">{tx.type}</Badge>
                          </TableCell>
                          <TableCell className="font-black text-sm text-primary">+${tx.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-right px-8">
                            <Badge className={tx.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-none font-black text-[9px] px-2' : 'bg-amber-50 text-amber-700 border-none font-black text-[9px] px-2'}>
                              {tx.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-bold italic">No financial records currently logged.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </section>
            </div>

            <div className="space-y-8">
              {/* ROI Panel */}
              <Card className="rounded-3xl border-none shadow-xl bg-slate-900 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <PieChart className="w-32 h-32 text-white" />
                </div>
                <CardHeader>
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Retention Economics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span className="text-slate-400">Agency Health Score</span>
                      <span className="text-emerald-400">{stats.retentionROI}%</span>
                    </div>
                    <Progress value={stats.retentionROI} className="h-1.5 bg-white/10" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <p className="text-[11px] text-slate-300 leading-relaxed italic font-medium">
                      "AegisSage has prevented potential disenrollments this quarter, saving an estimated <strong className="text-white">${(members.filter(m => m.retentionScore > 80).length * 600).toLocaleString()}</strong> in renewal revenue."
                    </p>
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] h-10 rounded-2xl shadow-lg shadow-primary/40" onClick={() => handleAction("ROI Deep-Dive", "Loading granular retention economic models...")}>
                    View ROI Analysis
                  </Button>
                </CardContent>
              </Card>

              {/* Individual Account Context */}
              <Card className="rounded-3xl border border-border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                    <UserCircle className="w-4 h-4 text-primary" />
                    Individualized Splits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-bold">
                    Commissions are auto-split based on broker assignment rules defined in <strong>Settings &gt; Team</strong>.
                  </p>
                  <div className="space-y-3">
                    {brokers?.slice(0, 3).map((broker, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-foreground uppercase">{broker.name}</span>
                          <span className="text-[8px] font-bold text-muted-foreground">NPN: {broker.npn}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-primary">${(stats.totalPaid * (i === 0 ? 0.7 : 0.15)).toFixed(0)}</p>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Active Split</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* SaaS Billing Lock */}
          <div className="p-10 rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary shadow-inner">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Financial Compliance Lock</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-bold">
                Your AegisSage subscription is managed via BAA-compliant payment processors. All commission data is encrypted with AES-256 and accessible only to authorized agency roles.
              </p>
              <Button variant="link" className="text-xs font-black text-primary uppercase tracking-widest underline-offset-4" onClick={navigateToBilling}>Download Billing History</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
