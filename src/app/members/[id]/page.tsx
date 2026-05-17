"use client"

import { useParams } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { CollectionSidebar } from "@/components/collection-sidebar"
import { InsightsPanel } from "@/components/InsightsPanel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  Download, ShieldAlert, History, User, Heart, ShieldCheck, 
  Mail, Briefcase, Stethoscope, Pill, Calendar, CreditCard,
  FileCheck, FileText, PhoneCall, Printer, Zap, Network, Shield
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export default function MemberDetailPage() {
  const { id } = useParams()
  const members = useAppStore(s => s.members)
  const member = members.find(m => m.id === id)

  const handleGeneratePDF = () => {
    toast({ title: "Module 5: Engagement Engine", description: "Generating personalized benefits summary PDF..." })
    setTimeout(() => {
      toast({ title: "Export Complete", description: "PDF summary has been downloaded." })
    }, 1500)
  }

  if (!member) return <div className="p-20 text-center font-black uppercase tracking-widest opacity-30 text-foreground">Member record not found.</div>

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-card/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground uppercase tracking-tight">{member.fullName}</h1>
              <div className="flex items-center gap-2">
                <Badge variant={member.status === 'churn-risk' ? 'destructive' : 'secondary'} className="rounded-md uppercase text-[8px] font-black px-2 py-0">
                  {member.status}
                </Badge>
                <span className="text-[9px] font-mono text-muted-foreground uppercase">{member.medicareId}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest border-border" onClick={handleGeneratePDF}>
              <Download className="w-4 h-4 mr-2" />
              Benefits PDF
            </Button>
            <Button className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest bg-secondary hover:bg-secondary/90 shadow-sm border border-border">
              Update Policy
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-8 pb-32">
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="bg-muted p-1 rounded-2xl border border-border shadow-inner">
              <TabsTrigger value="overview" className="rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
                Overview
              </TabsTrigger>
              <TabsTrigger value="policy" className="rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
                Policy & LIS
              </TabsTrigger>
              <TabsTrigger value="retention" className="rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
                Retention Mod
              </TabsTrigger>
              <TabsTrigger value="health" className="rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
                Health & Rx
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8 mt-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="rounded-3xl border-border shadow-sm bg-card overflow-hidden">
                  <CardHeader className="pb-4 border-b bg-muted/30">
                    <CardTitle className="text-[10px] font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                      <User className="w-4 h-4 text-primary" />
                      Demographics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <dl className="space-y-4">
                      <div className="flex justify-between items-center">
                        <dt className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">DOB</dt>
                        <dd className="text-xs font-black uppercase">{member.dob} ({member.age} yrs)</dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">MBI</dt>
                        <dd className="text-xs font-mono font-black text-primary">{member.medicareId}</dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Contact</dt>
                        <dd className="text-xs font-black uppercase">{member.phone}</dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">PTC Expiry</dt>
                        <dd className="text-xs font-black text-amber-600 uppercase">{member.ptcExpiryDate}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-border shadow-sm bg-card overflow-hidden">
                  <CardHeader className="pb-4 border-b bg-muted/30">
                    <CardTitle className="text-[10px] font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      Retention Index
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Loyalty Score</span>
                        <span className="text-sm font-black text-foreground">{member.retentionScore}%</span>
                      </div>
                      <Progress value={member.retentionScore} className="h-1.5 bg-muted shadow-inner" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-xl bg-muted/50 text-center">
                        <p className="text-[8px] font-black text-muted-foreground uppercase">HETS Check</p>
                        <p className="text-[10px] font-black uppercase text-foreground">Verified</p>
                      </div>
                      <div className="p-2 rounded-xl bg-muted/50 text-center">
                        <p className="text-[8px] font-black text-muted-foreground uppercase">POA Status</p>
                        <p className="text-[10px] font-black uppercase text-foreground">{member.poaStatus}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-border shadow-sm bg-card overflow-hidden">
                  <CardHeader className="pb-4 border-b bg-muted/30">
                    <CardTitle className="text-[10px] font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                      <Zap className="w-4 h-4 text-primary" />
                      Engagement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                     <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-[10px] text-primary leading-relaxed font-black uppercase tracking-tight">
                        MOD 5: Benefit utilization nudge scheduled for next month.
                     </div>
                     <Button variant="outline" size="sm" className="w-full text-[9px] font-black uppercase tracking-widest h-9 border-primary/20 hover:bg-primary/5 text-primary rounded-xl">
                        Preview Next Nudge
                     </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-3xl border-border shadow-sm bg-card p-8">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Intelligent Agent Notes
                </h3>
                <p className="text-sm text-foreground font-medium leading-relaxed italic opacity-80">
                  {member.notes || "Member is currently in active monitoring. No anomalies detected in current carrier snapshot. Last check-in call was positive; member expressed satisfaction with pharmacy benefits. Recommend triggering the AEP Shield preview in late September to maintain loyalty."}
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="retention" className="space-y-6 mt-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="rounded-3xl bg-card border border-border shadow-sm p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight">POA Shield (Module 4)</h3>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Healthcare Plan Advocate</p>
                    </div>
                  </div>
                  
                  {member.poaStatus === 'shielded' ? (
                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Active Advocate</p>
                          <p className="text-sm font-black text-foreground uppercase">{member.poaName}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{member.poaPhone}</p>
                        </div>
                        <Badge className="bg-emerald-500 text-white border-none font-black text-[9px] px-2 py-0.5">SHIELDED</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed font-medium uppercase opacity-70">
                        Competing agents will be routed to the designated advocate before any plan changes can be discussed.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-muted/30 border border-dashed border-border text-center">
                        <p className="text-sm font-black text-muted-foreground uppercase opacity-50">Shield Not Active</p>
                      </div>
                      <Button className="w-full h-12 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                        Initiate Advocate Enrollment
                      </Button>
                    </div>
                  )}
                </Card>

                <Card className="rounded-3xl bg-card border border-border shadow-sm p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm">
                      <Network className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight">HETS Monitoring (Mod 1)</h3>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Real-Time CMS Status</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-4">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Last HETS Poll</span>
                      <span className="text-xs font-black uppercase">{member.lastCmsCheck ? new Date(member.lastCmsCheck).toLocaleString() : 'Pending'}</span>
                    </div>
                    <div className="flex items-center justify-between border-b pb-4">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status Signal</span>
                      <Badge variant="outline" className="text-[9px] font-black uppercase border-emerald-200 bg-emerald-50 text-emerald-700">ENROLLMENT_CONFIRMED</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Future Effective Detection</span>
                      <span className="text-[10px] font-black uppercase text-emerald-600">No Switches Detected</span>
                    </div>
                    <Button variant="outline" className="w-full h-12 rounded-2xl border-border font-black uppercase tracking-widest text-[10px] hover:bg-muted">
                      Manual HETS Refresh
                    </Button>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="policy" className="space-y-6 mt-6 animate-in slide-in-from-left-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-3xl bg-card border-border shadow-sm overflow-hidden">
                   <CardHeader className="border-b bg-muted/30">
                      <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-widest">
                        <Briefcase className="w-4 h-4 text-primary" />
                        Plan Information
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="pt-6">
                      <dl className="grid grid-cols-2 gap-y-4">
                        <dt className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Carrier</dt>
                        <dd className="text-xs font-black uppercase">{member.carrier}</dd>
                        <dt className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Plan Name</dt>
                        <dd className="text-xs font-black uppercase">{member.planName}</dd>
                        <dt className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Premium</dt>
                        <dd className="text-xs font-black uppercase">{member.monthlyPremium}</dd>
                        <dt className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Enrollment</dt>
                        <dd className="text-xs font-black uppercase">{member.enrollmentPeriod}</dd>
                        <dt className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Part A Effective</dt>
                        <dd className="text-xs font-black uppercase">{member.partAEffective}</dd>
                        <dt className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Part B Effective</dt>
                        <dd className="text-xs font-black uppercase">{member.partBEffective}</dd>
                      </dl>
                   </CardContent>
                </Card>

                <Card className="rounded-3xl bg-card border-border shadow-sm overflow-hidden">
                   <CardHeader className="border-b bg-muted/30">
                      <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-widest">
                        <CreditCard className="w-4 h-4 text-primary" />
                        Financial Assistance
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="pt-6 space-y-4">
                      <div className="p-5 rounded-2xl bg-muted/50 border border-border text-[11px] leading-relaxed font-medium uppercase opacity-80">
                        <p className="font-black text-foreground mb-2">Extra Help / LIS Status</p>
                        <p>Member currently {member.medicareMedicaidStatus === 'Medicare' ? 'evaluated for' : 'has'} federal financial assistance. Estimated annual savings: <span className="text-primary font-black">$5,700</span>.</p>
                      </div>
                      <Button className="w-full h-12 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20">
                         Initiate LIS Enrollment Bot
                      </Button>
                   </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <InsightsPanel member={member} />
    </div>
  )
}
