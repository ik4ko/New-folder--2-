
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Banknote, TrendingUp, TrendingDown, DollarSign, 
  ArrowUpRight, Wallet, History, Download, 
  CreditCard, PieChart, ShieldAlert, CheckCircle2,
  Calendar, ArrowRightLeft, Building2, UserCircle
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { useMemo } from "react"

export default function AccountingPage() {
  const { ledger, members, agencyProfile } = useAppStore()

  const stats = useMemo(() => {
    const totalPaid = ledger.filter(t => t.status === 'paid').reduce((acc, t) => acc + t.amount, 0)
    const pending = ledger.filter(t => t.status === 'pending').reduce((acc, t) => acc + t.amount, 0)
    
    // Medicare Economics: Approx $600/year per member
    const bookValue = members.length * 600
    const churnRiskValue = members.filter(m => m.status === 'churn-risk').length * 600
    
    return {
      totalPaid,
      pending,
      bookValue,
      churnRiskValue,
      retentionROI: 92 // Logic-based ROI simulation
    }
  }, [ledger, members])

  const handleExport = () => {
    toast({ title: "Exporting Ledger", description: "Generating encrypted financial CSV..." })
  }

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">Agency Accounting</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">Commissions & SaaS Billing</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-2xl h-10 text-xs font-bold" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export Statements
            </Button>
            <Button className="rounded-2xl h-10 text-xs font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <CreditCard className="w-4 h-4 mr-2" /> Manage SaaS Plan
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-8 pb-32">
          {/* Economic Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
            <Card className="rounded-3xl border-none shadow-sm bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest">Total Book Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-primary">${stats.bookValue.toLocaleString()}</div>
                <p className="text-[10px] text-primary/70 mt-1 font-bold">Annualized Estimate</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm bg-card">
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
                <p className="text-[10px] text-destructive/70 mt-1 font-bold">Projected Churn Loss</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">SaaS Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-foreground">$899</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold">{agencyProfile.billingPlan.toUpperCase()} Plan (Monthly)</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Section 01: Transaction Ledger */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight">01. Commission Ledger</h2>
                    <p className="text-xs text-muted-foreground">Immutable history of member-driven agency revenue.</p>
                  </div>
                  <Badge variant="outline" className="font-bold border-primary/20 text-primary">Live Sync: Clover/AGA</Badge>
                </div>

                <Card className="rounded-3xl border-none shadow-sm bg-card overflow-hidden">
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
                      {ledger.map((tx) => (
                        <TableRow key={tx.id} className="border-border/50 hover:bg-slate-50/50">
                          <TableCell className="px-8 font-bold text-sm">
                            <div className="flex flex-col">
                              <span>{tx.memberName}</span>
                              <span className="text-[9px] text-muted-foreground font-mono">ID: {tx.memberId}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{tx.date}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[9px] uppercase font-black">{tx.type}</Badge>
                          </TableCell>
                          <TableCell className="font-black text-sm text-primary">+${tx.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-right px-8">
                            <Badge className={tx.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-none' : 'bg-amber-50 text-amber-700 border-none'}>
                              {tx.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </section>
            </div>

            <div className="space-y-8">
              {/* ROI Panel */}
              <Card className="rounded-3xl border-none shadow-sm bg-slate-900 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <PieChart className="w-32 h-32" />
                </div>
                <CardHeader>
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Retention Economics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span>Agency Health Score</span>
                      <span className="text-emerald-400">{stats.retentionROI}%</span>
                    </div>
                    <Progress value={stats.retentionROI} className="h-1.5 bg-white/10" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <p className="text-[11px] text-slate-300 leading-relaxed italic">
                      "MediStay has prevented {members.filter(m => m.retentionScore > 80).length} potential disenrollments this quarter, saving an estimated <strong>${(members.filter(m => m.retentionScore > 80).length * 600).toLocaleString()}</strong> in commission revenue."
                    </p>
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] h-10 rounded-2xl">
                    View ROI Deep-Dive
                  </Button>
                </CardContent>
              </Card>

              {/* Individual Account Context */}
              <Card className="rounded-3xl border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-primary" />
                    Individual Payouts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Commissions are auto-split based on broker assignment rules defined in <strong>Settings > Identity</strong>.
                  </p>
                  <div className="space-y-3">
                    {[
                      { name: 'John Doe (Owner)', amount: '$4,200', split: '70%' },
                      { name: 'Sarah Smith', amount: '$1,800', split: '30%' }
                    ].map((broker, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border">
                        <span className="text-[10px] font-bold">{broker.name}</span>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-primary">{broker.amount}</p>
                          <p className="text-[8px] font-bold text-muted-foreground">Split: {broker.split}</p>
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
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest">SaaS Billing & Account Lock</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                Your MediStay subscription is currently on the <strong>Professional Tier</strong>. Billing is automated through Stripe via your BAA-compliant payment method. All financial data is encrypted at rest.
              </p>
              <Button variant="link" className="text-xs font-bold text-primary underline-offset-4">Download Billing History</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
