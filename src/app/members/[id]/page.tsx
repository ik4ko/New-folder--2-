
"use client"

import { useParams } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { CollectionSidebar } from "@/components/collection-sidebar"
import { InsightsPanel } from "@/components/insights-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  Download, ShieldAlert, History, User, Heart, ShieldCheck, 
  Mail, Briefcase, Stethoscope, Pill, Calendar, CreditCard,
  FileCheck, FileText, PhoneCall, Printer, Zap
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

  if (!member) return <div className="p-20 text-center font-bold text-muted-foreground">Member record not found.</div>

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/80 dark:bg-card/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">{member.fullName}</h1>
            <Badge variant={member.status === 'churn-risk' ? 'destructive' : 'secondary'} className="rounded-full uppercase text-[10px] px-3 py-0.5">
              {member.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl h-9 text-[11px] font-bold" onClick={handleGeneratePDF}>
              <Download className="w-4 h-4 mr-2" />
              Benefit Summary
            </Button>
            <Button className="rounded-xl h-9 text-[11px] font-bold bg-secondary hover:bg-secondary/90 shadow-sm">
              Update Policy
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="bg-muted p-1 rounded-2xl border border-border">
              <TabsTrigger value="overview" className="rounded-xl px-6 py-2 text-xs font-bold">
                Overview
              </TabsTrigger>
              <TabsTrigger value="policy" className="rounded-xl px-6 py-2 text-xs font-bold">
                Policy & LIS
              </TabsTrigger>
              <TabsTrigger value="health" className="rounded-xl px-6 py-2 text-xs font-bold">
                Health & Rx
              </TabsTrigger>
              <TabsTrigger value="compliance" className="rounded-xl px-6 py-2 text-xs font-bold">
                Compliance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="rounded-2xl border-border shadow-sm bg-card">
                  <CardHeader className="pb-2 border-b border-muted mb-4">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Demographics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <dt className="text-muted-foreground font-medium">Date of Birth</dt>
                        <dd className="font-bold">{member.dob} ({member.age} yrs)</dd>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <dt className="text-muted-foreground font-medium">Medicare MBI</dt>
                        <dd className="font-mono text-primary font-bold">{member.medicareId}</dd>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <dt className="text-muted-foreground font-medium">Address</dt>
                        <dd className="text-[10px] text-right max-w-[140px] truncate">{member.address}</dd>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <dt className="text-muted-foreground font-medium">Contact</dt>
                        <dd className="font-bold">{member.phone}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border shadow-sm bg-card">
                  <CardHeader className="pb-2 border-b border-muted mb-4">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      Retention Modules
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground font-medium">Overall Score</span>
                        <span className="font-black text-foreground">{member.retentionScore}%</span>
                      </div>
                      <Progress value={member.retentionScore} className="h-1.5" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">POA Shield:</span>
                        <Badge variant="outline" className="text-[9px] uppercase">{member.poaStatus}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">SSBCI Fax:</span>
                        <Badge variant="outline" className="text-[9px] uppercase">{member.ssbciStatus}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">AI Call:</span>
                        <Badge variant="outline" className="text-[9px] uppercase">{member.checkInStatus}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border shadow-sm bg-card">
                  <CardHeader className="pb-2 border-b border-muted mb-4">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Engagement Engine
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-[10px] text-primary leading-relaxed font-medium">
                        Module 5: Personalized benefits nudge scheduled for 1st of next month.
                     </div>
                     <Button variant="outline" size="sm" className="w-full text-[10px] h-8 font-bold border-primary/20">
                        Preview Next Nudge
                     </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border-border shadow-sm bg-card p-6">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Intelligent Agent Notes
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {member.notes || "Member is currently in active monitoring. No anomalies detected in current carrier snapshot. Last check-in call was positive; member expressed satisfaction with pharmacy benefits. Recommend triggering the AEP Shield preview in late September to maintain loyalty."}
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="policy" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-2xl bg-card border-border shadow-sm">
                   <CardHeader className="border-b border-muted">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" />
                        Plan Information
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="pt-6">
                      <dl className="grid grid-cols-2 gap-y-4 text-xs">
                        <dt className="text-muted-foreground">Carrier</dt>
                        <dd className="font-bold">{member.carrier}</dd>
                        <dt className="text-muted-foreground">Plan Name</dt>
                        <dd className="font-bold">{member.planName}</dd>
                        <dt className="text-muted-foreground">Premium</dt>
                        <dd className="font-bold">{member.monthlyPremium}</dd>
                        <dt className="text-muted-foreground">Enrollment Period</dt>
                        <dd className="font-bold uppercase">{member.enrollmentPeriod}</dd>
                        <dt className="text-muted-foreground">Part A Effective</dt>
                        <dd className="font-bold">{member.partAEffective}</dd>
                        <dt className="text-muted-foreground">Part B Effective</dt>
                        <dd className="font-bold">{member.partBEffective}</dd>
                      </dl>
                   </CardContent>
                </Card>

                <Card className="rounded-2xl bg-card border-border shadow-sm">
                   <CardHeader className="border-b border-muted">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        Financial Assistance (LIS)
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="pt-6 space-y-4">
                      <div className="p-4 rounded-xl bg-muted/50 border border-border text-xs leading-relaxed">
                        <p className="font-bold mb-1">Extra Help / LIS Status</p>
                        <p className="text-muted-foreground">Member currently {member.medicareMedicaidStatus === 'Medicare' ? 'evaluated for' : 'has'} federal financial assistance. Estimated annual savings: $5,700.</p>
                      </div>
                      <Button className="w-full text-[10px] font-bold h-9 bg-primary hover:bg-primary/90">
                         Initiate LIS Enrollment Bot
                      </Button>
                   </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="health" className="space-y-6 mt-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="rounded-2xl border-border shadow-sm bg-card">
                     <CardHeader className="border-b border-muted">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-primary" />
                          Providers
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">PCP Name</span>
                          <span className="font-bold">{member.pcpName || 'Not Set'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Preferred Pharmacy</span>
                          <span className="font-bold">{member.pharmacyName || 'Not Set'}</span>
                        </div>
                     </CardContent>
                  </Card>
                  
                  <Card className="rounded-2xl border-border shadow-sm bg-card">
                     <CardHeader className="border-b border-muted">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Pill className="w-4 h-4 text-primary" />
                          Formulary & Medications
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="pt-6">
                        {member.medications.length > 0 ? (
                          <div className="space-y-3">
                            {member.medications.map((med, i) => (
                              <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 text-[10px]">
                                <span className="font-bold">{med.name} ({med.dosage})</span>
                                <Badge variant="secondary" className="text-[8px] h-4">Tier {med.tier}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic text-center py-4">No medications listed.</p>
                        )}
                     </CardContent>
                  </Card>
               </div>
            </TabsContent>

            <TabsContent value="compliance" className="mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <Card className="rounded-2xl border-border shadow-sm bg-card">
                      <CardHeader className="border-b border-muted">
                         <CardTitle className="text-sm font-bold flex items-center gap-2">
                           <FileCheck className="w-4 h-4 text-primary" />
                           Compliance Documents
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                         <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">SOA Status</span>
                            <Badge variant={member.soaStatus === 'Completed' ? 'secondary' : 'outline'}>{member.soaStatus}</Badge>
                         </div>
                         <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">SOA Date</span>
                            <span className="font-bold">{member.soaDate || 'N/A'}</span>
                         </div>
                         <Button variant="outline" size="sm" className="w-full text-[10px] font-bold border-primary/20">
                            Download Compliance Bundle
                         </Button>
                      </CardContent>
                   </Card>

                   <Card className="rounded-2xl border-border shadow-sm bg-card">
                      <CardHeader className="border-b border-muted">
                         <CardTitle className="text-sm font-bold flex items-center gap-2">
                           <History className="w-4 h-4 text-primary" />
                           Audit Log
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                         <div className="space-y-3">
                            {[
                              { date: "2024-11-20", action: "MARx Snapshot Poll", detail: "No switch detected" },
                              { date: "2024-11-15", action: "AI Check-in Call", detail: "Member satisfied" },
                              { date: "2024-10-01", action: "Carrier Email Parse", detail: "Enrollment confirmed" }
                            ].map((item, i) => (
                              <div key={i} className="text-[10px] border-b border-muted pb-2 last:border-0">
                                <div className="flex justify-between mb-1">
                                  <span className="font-bold">{item.action}</span>
                                  <span className="text-muted-foreground font-mono">{item.date}</span>
                                </div>
                                <p className="text-muted-foreground italic">{item.detail}</p>
                              </div>
                            ))}
                         </div>
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
