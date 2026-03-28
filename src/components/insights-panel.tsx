"use client"

import { useState, useEffect } from "react"
import { 
  Sparkles, TriangleAlert, ShieldCheck, UserPlus, Printer, 
  Phone, Info, Calendar, Handshake, BrainCircuit, RefreshCw, PhoneCall, CircleAlert
} from "lucide-react"
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
    toast({ title: "Module 3: SSBCI Fax Agent", description: "Generating HIPAA package & faxing physician..." })
    updateMember(member.id, { ssbciStatus: 'faxed' })
  }

  const handlePOASetup = () => {
    if (!member) return;
    toast({ title: "Module 4: POA Shield", description: "Initiating healthcare plan advocate invitation..." })
    updateMember(member.id, { poaStatus: 'pending-invite' })
  }

  const handleTriggerAICall = () => {
    if (!member) return;
    toast({ title: "Module 2: AI Member Agent", description: "Queuing soft check-in call (Maya AI)..." })
    updateMember(member.id, { checkInStatus: 'called' })
  }

  if (!member) return (
    <aside className="w-80 border-l border-border bg-card p-6 hidden lg:flex flex-col gap-6">
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center text-primary">
          <BrainCircuit className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">MediStay Intelligence</h3>
          <p className="text-xs text-muted-foreground mt-1 px-4 leading-relaxed">Select a member to view retention modules and AI agent status.</p>
        </div>
      </div>
    </aside>
  );

  return (
    <aside className="w-80 border-l border-border bg-card p-6 hidden lg:flex flex-col gap-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-sm font-bold text-foreground">Member Intel</h2>
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
            <Card className="rounded-2xl border-destructive/20 bg-destructive/5 shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-destructive flex items-center gap-2">
                  <TriangleAlert className="w-3.5 h-3.5" />
                  MODULE 1: CMS SWITCH DETECTED
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[11px] text-destructive leading-relaxed font-medium">
                  Disenrollment pending on MARx snapshot. New Carrier: {member.carrier || 'Detected'}. 24h window active.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <Button size="sm" className="bg-destructive hover:bg-destructive/90 text-white rounded-xl text-[10px] h-8 font-bold">
                    <Phone className="w-3 h-3 mr-1" /> Emergency Outreach
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Module Control</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground/50" /></TooltipTrigger>
                  <TooltipContent><p className="text-[10px]">Autonomous background tasks</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Printer className="w-3.5 h-3.5 text-primary" />
                    <span className="font-bold text-xs text-foreground">SSBCI Fax Agent</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase font-bold">{member.ssbciStatus}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Module 3: Automatically fax chronic care documentation to physician to activate benefits.
                </p>
                {member.ssbciStatus === 'pending-fax' && (
                  <Button onClick={handleTriggerFax} size="sm" className="w-full h-8 text-[10px] font-bold rounded-xl">
                    <Printer className="w-3 h-3 mr-1.5" /> Trigger Fax Package
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-3.5 h-3.5 text-primary" />
                    <span className="font-bold text-xs text-foreground">POA Shield</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase font-bold">{member.poaStatus}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Module 4: Designate a family advocate contact on the member's plan to deter switcher agents.
                </p>
                {member.poaStatus === 'unprotected' && (
                  <Button onClick={handlePOASetup} variant="outline" size="sm" className="w-full h-8 text-[10px] font-bold rounded-xl border-primary/20 text-primary">
                    <ShieldCheck className="w-3 h-3 mr-1.5" /> Setup Shield
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border bg-card shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-3.5 h-3.5 text-primary" />
                    <span className="font-bold text-xs text-foreground">AI Member Agent</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase font-bold">{member.checkInStatus}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Module 2: Soft check-in calls at Day 7, 30, and 75 to catch dissatisfaction early.
                </p>
                <Button onClick={handleTriggerAICall} variant="outline" size="sm" className="w-full h-8 text-[10px] font-bold rounded-xl border-border">
                  <RefreshCw className="w-3 h-3 mr-1.5" /> Queue Manual Call
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="pt-4 mt-auto">
             <Button variant="outline" className="w-full rounded-2xl border-primary text-primary bg-card/50 hover:bg-primary/5 text-[11px] font-bold h-11 group">
                <Handshake className="w-4 h-4 mr-2 text-primary group-hover:animate-pulse" />
                Enroll in LIS / Medicaid
             </Button>
             <p className="text-[9px] text-center text-muted-foreground mt-2 px-2">Managed autonomously by MediStay AI. PHI remains agent-scoped.</p>
          </div>
        </>
      )}
    </aside>
  );
}