
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Sparkles, BrainCircuit, Zap, BarChart3, TrendingDown, Target, Wand2, Send } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useState } from "react"

export default function RetentionAIPage() {
  const [query, setQuery] = useState("")
  const [messages, setQueryHistory] = useState([
    { role: 'ai', content: "Hello. I'm the MediStay Intelligence Agent. I can help you analyze churn risks, identify LIS eligibility gaps, or generate custom retention strategies for your book of business." }
  ])

  const handleQuery = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query) return
    setQueryHistory([...messages, { role: 'user', content: query }])
    setQuery("")
    setTimeout(() => {
      setQueryHistory(prev => [...prev, { role: 'ai', content: "Based on my analysis of your 1,244 members, I've identified 12 high-risk switches in the Northeast region. I recommend triggering the 'Provider Network Nudge' flow for these individuals immediately." }])
    }, 1000)
  }

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Retention AI (Claude Agent)</h1>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 px-3 font-bold">SONNET 3.5: ACTIVE</Badge>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
          <div className="lg:col-span-2 flex flex-col h-full border-r relative bg-[#F7F4F0]/30 dark:bg-background">
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                      : 'bg-card border border-border shadow-sm'
                  }`}>
                    {m.role === 'ai' && (
                      <div className="flex items-center gap-2 mb-2 text-primary">
                        <BrainCircuit className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">MediStay Intelligence</span>
                      </div>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t bg-card">
              <form onSubmit={handleQuery} className="relative group">
                <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-all -z-10" />
                <Input 
                  placeholder="Ask for risk reports, LIS analysis, or AEP prep..." 
                  className="h-14 rounded-2xl pr-14 border-primary/20 bg-white/80 dark:bg-card/80 backdrop-blur-sm focus-visible:ring-primary shadow-lg"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button type="submit" className="absolute right-2 top-2 rounded-xl h-10 w-10 p-0 shadow-sm" disabled={!query}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                <Button variant="outline" size="sm" className="rounded-full text-[10px] h-7 font-bold border-primary/20 bg-white/50">
                  Top Churn Risks
                </Button>
                <Button variant="outline" size="sm" className="rounded-full text-[10px] h-7 font-bold border-primary/20 bg-white/50">
                  LIS Gap Analysis
                </Button>
                <Button variant="outline" size="sm" className="rounded-full text-[10px] h-7 font-bold border-primary/20 bg-white/50">
                  AEP Shield Prep
                </Button>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8 overflow-y-auto bg-card">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Risk Probabilities
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>Network Change Impact</span>
                    <span className="text-destructive">High Risk (12%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-destructive w-[12%]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span>Formulary Drift</span>
                    <span className="text-amber-500">Medium Risk (24%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-[24%]" />
                  </div>
                </div>
              </div>
            </div>

            <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-primary flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  AI Suggested Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Target className="w-3 h-3 text-primary" />
                  </div>
                  <p className="text-[10px] leading-relaxed font-medium">
                    Trigger <strong>AEP Shield</strong> early for dual-eligible members in ZIP 94103.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Wand2 className="w-3 h-3 text-primary" />
                  </div>
                  <p className="text-[10px] leading-relaxed font-medium">
                    Auto-generate SSBCI packages for 4 new chronic enrollments detected this hour.
                  </p>
                </div>
                <Button size="sm" className="w-full text-[10px] h-8 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 mt-2">
                  Execute All Recommends
                </Button>
              </CardContent>
            </Card>

            <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agent Reasoning</h4>
              <p className="text-[11px] leading-relaxed text-slate-300 italic font-medium">
                "Correlating CMS disenrollment trends with historical AEP switch data suggests a 4.2% increase in churn probability for members without a recorded SSBCI physician visit in the last 120 days."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
