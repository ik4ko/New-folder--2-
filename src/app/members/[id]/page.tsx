"use client"

import { useParams } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { CollectionSidebar } from "@/components/collection-sidebar"
import { InsightsPanel } from "@/components/insights-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Download, ShieldAlert, History, User, Heart, ShieldCheck, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MemberDetailPage() {
  const { id } = useParams()
  const members = useAppStore(s => s.members)
  const member = members.find(m => m.id === id)

  const handleGeneratePDF = () => {
    toast({ title: "Processing", description: "Generating branded PDF summary..." })
    setTimeout(() => {
      toast({ title: "Export Complete", description: "PDF has been downloaded." })
    }, 1500)
  }

  if (!member) return <div className="p-20 text-center font-bold text-slate-400">Member record not found.</div>

  return (
    <div className="flex h-full w-full bg-slate-50/50">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-slate-200 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-900">{member.fullName}</h1>
            <Badge variant={member.status === 'churn-risk' ? 'destructive' : 'secondary'} className="rounded-full uppercase text-[10px] px-3 py-0.5">
              {member.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl h-9 text-[11px] font-bold border-slate-200" onClick={handleGeneratePDF}>
              <Download className="w-4 h-4 mr-2" />
              Export Summary
            </Button>
            <Button className="rounded-xl h-9 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 shadow-sm">
              Update Policy
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <TabsTrigger value="overview" className="rounded-xl px-8 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                Member Overview
              </TabsTrigger>
              <TabsTrigger value="coverage" className="rounded-xl px-8 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                Benefits & Utilization
              </TabsTrigger>
              <TabsTrigger value="vault" className="rounded-xl px-8 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                Document Vault
              </TabsTrigger>
              <TabsTrigger value="audit" className="rounded-xl px-8 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                Compliance Log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="rounded-2xl border-slate-200 shadow-sm bg-white">
                  <CardHeader className="pb-2 border-b border-slate-50 mb-4">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      Demographics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <dt className="text-slate-500 font-medium">Current Age</dt>
                        <dd className="font-bold text-slate-900">{member.age} Years</dd>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <dt className="text-slate-500 font-medium">Medicare ID</dt>
                        <dd className="font-mono text-blue-600 font-bold">{member.medicareId}</dd>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <dt className="text-slate-500 font-medium">Federal Status</dt>
                        <dd className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black">{member.medicareMedicaidStatus}</dd>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <dt className="text-slate-500 font-medium">Enrollment Date</dt>
                        <dd className="font-bold text-slate-900">{member.enrollmentDate}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-sm bg-white">
                  <CardHeader className="pb-2 border-b border-slate-50 mb-4">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      Clinical Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {member.healthConditions && member.healthConditions.length > 0 ? member.healthConditions.map(c => (
                        <Badge key={c} className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none rounded-lg text-[10px] px-3">
                          {c}
                        </Badge>
                      )) : (
                        <span className="text-xs text-slate-400 italic">No clinical flags reported</span>
                      )}
                    </div>
                    <div className="mt-6 p-4 rounded-xl bg-orange-50 border border-orange-100 text-[10px] text-orange-800 leading-relaxed font-medium">
                      <ShieldAlert className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" />
                      Chronic plan eligibility detected. SSBCI documentation should be prioritized for carrier activation.
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 shadow-sm bg-white">
                  <CardHeader className="pb-2 border-b border-slate-50 mb-4">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      Retention Protection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-500 font-medium">Protection Score</span>
                        <span className="font-black text-slate-900">{member.retentionScore}%</span>
                      </div>
                      <Progress value={member.retentionScore} className="h-2 bg-slate-100" />
                    </div>
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 text-[10px]">
                        <div className={`w-2 h-2 rounded-full ${member.poaStatus === 'shielded' ? 'bg-green-500' : 'bg-slate-200'}`} />
                        <span className="font-bold">POA Family Advocate: {member.poaStatus}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <div className={`w-2 h-2 rounded-full ${member.ssbciStatus === 'approved' ? 'bg-green-500' : 'bg-slate-200'}`} />
                        <span className="font-bold">SSBCI Fax Approval: {member.ssbciStatus}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border-slate-200 shadow-sm bg-white p-8">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  Intelligent Member Notes
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                  {member.notes || "Member is currently in active monitoring. No anomalies detected in current carrier snapshot. Last check-in call was positive; member expressed satisfaction with pharmacy benefits. Recommend triggering the AEP Shield preview in late September to maintain loyalty."}
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="audit">
              <div className="space-y-4">
                {[
                  { date: "2024-11-20 14:22", action: "MARx Snapshot Compared", agent: "CMS Monitor Bot", detail: "No changes detected" },
                  { date: "2024-11-15 09:10", action: "SSBCI Documentation Sent", agent: "Fax Agent", detail: "Sent to Dr. Smith's Office" },
                  { date: "2024-11-14 11:05", action: "Member Record Synchronized", agent: "GHL Integration", detail: "Profile data updated" },
                  { date: "2024-10-01 16:30", action: "Member Intake Completed", agent: "Broker Agent", detail: "Initial enrollment processed" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-center p-5 rounded-2xl border border-slate-100 bg-white hover:border-blue-100 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-600 border border-slate-100">
                      <History className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-slate-900">{item.action}</p>
                        <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-slate-200">{item.agent}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.detail}</p>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-slate-400">{item.date}</div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <InsightsPanel member={member} />
    </div>
  )
}