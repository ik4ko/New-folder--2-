"use client"

import { useState, useEffect } from "react"
import { Sparkles, AlertTriangle, ShieldCheck, ChevronRight, HelpCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { insurancePlanRecommendation, type InsurancePlanRecommendationOutput } from "@/ai/flows/insurance-plan-recommendation"
import { predictClientChurn, type ClientChurnPredictionOutput } from "@/ai/flows/client-churn-prediction"
import { type ClientRecord } from "@/lib/store"
import { Skeleton } from "@/components/ui/skeleton"

interface InsightsPanelProps {
  client: ClientRecord | null;
}

export function InsightsPanel({ client }: InsightsPanelProps) {
  const [recommendations, setRecommendations] = useState<InsurancePlanRecommendationOutput | null>(null);
  const [churnPrediction, setChurnPrediction] = useState<ClientChurnPredictionOutput | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchInsights() {
      if (!client) return;
      setLoading(true);
      try {
        const [rec, churn] = await Promise.all([
          insurancePlanRecommendation({
            age: client.age,
            healthConditions: client.healthConditions,
            medicareMedicaidStatus: client.medicareMedicaidStatus
          }),
          predictClientChurn({
            clientAge: client.age,
            lastReviewDate: client.lastReviewDate
          })
        ]);
        setRecommendations(rec);
        setChurnPrediction(churn);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [client]);

  if (!client) return (
    <aside className="w-80 border-l border-border bg-background p-6 space-y-6">
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-4">
        <Sparkles className="w-12 h-12 opacity-20" />
        <p className="text-sm">Select a client to see AI-powered insights and risk flags.</p>
      </div>
    </aside>
  );

  return (
    <aside className="w-80 border-l border-border bg-sidebar-accent/10 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-headline font-semibold text-primary">Contextual Insights</h2>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl ai-shimmer" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {churnPrediction?.needsReview && (
            <Card className="rounded-2xl border-destructive/20 bg-destructive/5 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Review Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {churnPrediction.reason}
                </p>
                <Button size="sm" className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg text-[10px] h-7">
                  {churnPrediction.suggestedAction}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Tailored Plan Suggestions</h3>
            {recommendations?.suggestedPlans.map((plan, idx) => (
              <Card key={idx} className="rounded-2xl border-primary/20 bg-background shadow-sm hover:shadow-md transition-shadow group">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-sm text-primary">{plan.name}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-primary cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[200px] text-[11px]">
                          <p className="font-bold mb-1">Why this plan?</p>
                          {plan.reasoning}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {plan.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {recommendations?.riskFlags && recommendations.riskFlags.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Risk Flags</h3>
              <div className="space-y-2">
                {recommendations.riskFlags.map((risk, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100 text-[10px] text-amber-800 font-medium">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {risk}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 mt-auto">
             <Button variant="outline" className="w-full rounded-xl border-primary text-primary hover:bg-primary/5 text-xs font-semibold h-10 group">
                Generate AI Risk Report
                <Sparkles className="w-4 h-4 ml-2 group-hover:animate-pulse" />
             </Button>
          </div>
        </>
      )}
    </aside>
  );
}