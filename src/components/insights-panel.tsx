"use client"

import { useState, useEffect } from "react"
import { Sparkles, AlertTriangle, ShieldCheck, UserPlus, Printer, Phone, Info, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type MemberRecord, useAppStore } from "@/lib/store"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface InsightsPanelProps {
  member?: MemberRecord | null;
}

export function InsightsPanel({ member }: InsightsPanelProps) {
  const [loading, setLoading] = useState(false);
  const updateMember = useAppStore(s => s.updateMember)

  useEffect(() => {
    if (member?.id) {
      setLoading(true);
      const timer = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [member?.id]);

  const handleTriggerFax = () => {
    if (!member) return;
    toast({ title: "SSBCI Fax Initiated", description: "Generating HIPAA package via Documo API..." })
    updateMember(member.id, { ssbciStatus: 'faxed' })
  }

  const handlePOASetup = () => {
    if (!member) return;
    toast({ title: "POA Invite Sent", description: "Family advocate shield invitation sent to contact." })
    updateMember(member.id, { poaStatus: 'pending-invite' })
  }

  if (!member) return (
    <aside className="w-80 border-l border-slate-200 bg-white p-6 hidden lg:flex flex-col gap-6">
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">MediStay Intelligence</h3>
          <p className="text-xs text-slate-500 mt-1 px-4 leading-relaxed">Select a member to see retention scoring and automated bot actions.</p>
        </div>
      </div>
    </aside>
  );

  return (
    <aside className="w-80 border-l border-slate-200 bg-slate-50/30 p-6 hidden lg:flex flex-col gap-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Member Intel</h2>
        </div>
        <Badge className={`${member.retentionScore > 80 ? 'bg-green-100 text-green-700' : member.retentionScore > 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} border-none text-[10px] font-bold`}>
          Score: {member.retentionScore}
        </Badge>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl ai-shimmer" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {member.status === 'churn-risk' && (
            <Card className="rounded-2xl border-red-200 bg-red-50/50 shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  CMS ALERT: AT-RISK
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[11px] text-red-900 leading-relaxed font-medium">
                  Autonomous check detected disenrollment pending on MARx. Carrier: {member.carrier}.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] h-8 font-bold">
                    <Phone className="w-3 h-3 mr-1" /> Call Now
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-200 text-red-700 bg-white hover:bg-red-50 rounded-xl text-[10px] h-8 font-bold">
                    Request Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Retention Modules</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><Info className="w-3 h-3 text-slate-300" /></TooltipTrigger>
                  <TooltipContent><p className="text-[10px]">Automated background tasks</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Printer className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-bold text-xs text-slate-900">SSBCI Fax Agent</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase border-blue-100 text-blue-600 font-bold">{member.ssbciStatus}</Badge>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Chronic documentation for {member.healthConditions.length > 0 ? member.healthConditions.join(', ') : 'wellness check'}.
                </p>
                {member.ssbciStatus === 'pending-fax' && (
                  <Button onClick={handleTriggerFax} size="sm" className="w-full h-8 text-[10px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700">
                    <Printer className="w-3 h-3 mr-1.5" /> Send Fax to Doctor
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-bold text-xs text-slate-900">POA Shield</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase border-slate-100 text-slate-500 font-bold">{member.poaStatus}</Badge>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Protect member from switcher agents by designating a family advocate contact.
                </p>
                {member.poaStatus === 'unprotected' && (
                  <Button onClick={handlePOASetup} variant="outline" size="sm" className="w-full h-8 text-[10px] font-bold rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50">
                    <ShieldCheck className="w-3 h-3 mr-1.5" /> Setup Shield
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-bold text-xs text-slate-900">Engagement</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase border-green-100 text-green-600 font-bold">READY</Badge>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Monthly personalized benefits summary summarizing unused {member.carrier} credits.
                </p>
                <Button variant="outline" size="sm" className="w-full h-8 text-[10px] font-bold rounded-xl border-slate-200">
                  Preview Mailer
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="pt-4 mt-auto">
             <Button variant="outline" className="w-full rounded-2xl border-blue-600 text-blue-600 bg-white hover:bg-blue-50 text-[11px] font-bold h-11 group">
                <Sparkles className="w-4 h-4 mr-2 text-blue-500 group-hover:animate-pulse" />
                Generate Risk Assessment
             </Button>
             <p className="text-[9px] text-center text-slate-400 mt-2 px-2">Powered by MediStay AI. All data processed via AWS Bedrock HIPAA instance.</p>
          </div>
        </>
      )}
    </aside>
  );
}