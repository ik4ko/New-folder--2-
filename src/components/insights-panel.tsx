"use client"

import { useState, useEffect } from "react"
import { Sparkles, AlertTriangle, ShieldCheck, ChevronRight, HelpCircle, UserPlus, Printer, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { type MemberRecord } from "@/lib/store"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"

interface InsightsPanelProps {
  member: MemberRecord | null;
}

export function InsightsPanel({ member }: InsightsPanelProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setLoading(true);
      setTimeout(() => setLoading(false), 800);
    }
  }, [member]);

  const handleTriggerFax = () => {
    toast({ title: "SSBCI Fax Initiated", description: "Generating HIPAA package via Documo API..." })
  }

  const handlePOASetup = () => {
    toast({ title: "POA Invite Sent", description: "Family advocate shield invitation sent to contact." })
  }

  if (!member) return (
    <aside className="w-80 border-l border-border bg-background p-6 space-y-6">
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-4">
        <Sparkles className="w-12 h-12 opacity-20" />
        <p className="text-sm">Select a member to see MediStay retention intelligence and bot actions.</p>
      </div>
    </aside>
  );

  return (
    <aside className="w-80 border-l border-border bg-sidebar-accent/10 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-headline font-semibold text-primary">Member Intel</h2>
        </div>
        <Badge className="bg-primary/10 text-primary border-none text-[10px]">Score: {member.retentionScore}</Badge>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl ai-shimmer" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {member.status === 'churn-risk' && (
            <Card className="rounded-2xl border-destructive/20 bg-destructive/5 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  CMS Alert: Switch Detected
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[11px] text-foreground/80 leading-relaxed">
                  Agent 1 detected a disenrollment pending on MARx snapshot. Carrier: {member.carrier}.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" className="bg-destructive text-white rounded-lg text-[10px] h-7">
                    <Phone className="w-3 h-3 mr-1" />
                    Call Now
                  </Button>
                  <Button size="sm" variant="outline" className="border-destructive text-destructive rounded-lg text-[10px] h-7">
                    Record Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Retention Modules</h3>
            
            <Card className="rounded-2xl border-primary/20 bg-background shadow-sm group">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-primary" />
                    <span className="font-bold text-xs">SSBCI Fax Agent</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase">{member.ssbciStatus}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Chronic care documentation pre-fill for {member.healthConditions.join(', ')}.
                </p>
                {member.ssbciStatus === 'pending-fax' && (
                  <Button onClick={handleTriggerFax} size="sm" className="w-full h-7 text-[10px] rounded-lg">Send Fax to Doctor</Button>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-primary/20 bg-background shadow-sm group">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" />
                    <span className="font-bold text-xs">POA Shield</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase">{member.poaStatus}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Designate family advocate authorized contact on Medicare plan.
                </p>
                {member.poaStatus === 'unprotected' && (
                  <Button onClick={handlePOASetup} variant="outline" size="sm" className="w-full h-7 text-[10px] rounded-lg border-primary text-primary">Setup Shield</Button>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="pt-4 mt-auto">
             <Button variant="outline" className="w-full rounded-xl border-primary text-primary hover:bg-primary/5 text-xs font-semibold h-10 group">
                Generate AEP Shield Preview
                <Sparkles className="w-4 h-4 ml-2 group-hover:animate-pulse" />
             </Button>
          </div>
        </>
      )}
    </aside>
  );
}
