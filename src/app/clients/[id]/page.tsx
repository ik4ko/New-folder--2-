"use client"

import { useParams } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { CollectionSidebar } from "@/components/collection-sidebar"
import { InsightsPanel } from "@/components/insights-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { FileText, Download, Share2, ShieldAlert, History, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

export default function ClientDetailPage() {
  const { id } = useParams()
  const clients = useAppStore(s => s.clients)
  const client = clients.find(c => c.id === id)

  const handleGeneratePDF = () => {
    toast({ title: "Processing", description: "Generating branded PDF summary..." })
    setTimeout(() => {
      toast({ title: "Export Complete", description: "PDF has been downloaded." })
    }, 1500)
  }

  if (!client) return <div>Client not found</div>

  return (
    <div className="flex h-full w-full">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full bg-background">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-headline font-semibold text-primary">{client.fullName}</h1>
            <Badge variant={client.status === 'churn-risk' ? 'destructive' : 'secondary'} className="rounded-full uppercase text-[10px] px-3">
              {client.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl h-9 text-xs" onClick={handleGeneratePDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button className="rounded-xl h-9 text-xs bg-accent hover:bg-accent/90">
              Update Policy
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-sidebar-accent/50 p-1 rounded-2xl">
              <TabsTrigger value="overview" className="rounded-xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="coverage" className="rounded-xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                Coverage
              </TabsTrigger>
              <TabsTrigger value="documents" className="rounded-xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                Vault
              </TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-xl px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                Audit Trail
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-border bg-white space-y-4">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Demographic Summary
                  </h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between text-sm border-b pb-2">
                      <dt className="text-muted-foreground">Current Age</dt>
                      <dd className="font-semibold">{client.age} years</dd>
                    </div>
                    <div className="flex justify-between text-sm border-b pb-2">
                      <dt className="text-muted-foreground">Medicare Status</dt>
                      <dd className="font-semibold">{client.medicareMedicaidStatus}</dd>
                    </div>
                    <div className="flex justify-between text-sm border-b pb-2">
                      <dt className="text-muted-foreground">Last Review</dt>
                      <dd className="font-semibold">{client.lastReviewDate}</dd>
                    </div>
                    <div className="flex justify-between text-sm border-b pb-2">
                      <dt className="text-muted-foreground">Ownership ID</dt>
                      <dd className="font-mono text-xs opacity-50">{client.agentId}</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-6 rounded-2xl border border-border bg-white space-y-4">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Health Flags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(client.healthConditions ?? []).length > 0 ? (client.healthConditions ?? []).map(c => (
                      <Badge key={c} variant="outline" className="bg-primary/5 text-primary border-primary/20 rounded-lg">
                        {c}
                      </Badge>
                    )) : (
                      <span className="text-sm text-muted-foreground italic">No reported conditions</span>
                    )}
                  </div>
                  <div className="mt-4 p-4 rounded-xl bg-sidebar-accent/30 text-[11px] text-muted-foreground">
                    Metadata used for training anonymous recommendation models. PII remains agent-scoped and encrypted.
                  </div>
                </div>
              </div>

              <div className="p-8 rounded-2xl border border-border bg-white space-y-4">
                <h3 className="text-sm font-bold text-primary">Intelligent Notes</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Client is approaching the 12-month inactivity threshold. System has flagged a potential Medicare transition review for the upcoming quarter. Automated PDF summary for last review period is available in the Vault.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              <div className="space-y-4">
                {[
                  { date: "2024-11-20", action: "Policy Updated", agent: "System (Sync)" },
                  { date: "2024-11-15", action: "AI Suggestion Generated", agent: "Concierge" },
                  { date: "2024-10-01", action: "Client Record Created", agent: "Current Agent" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-center p-4 rounded-xl border bg-white">
                    <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center text-primary">
                      <History className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{item.action}</p>
                      <p className="text-xs text-muted-foreground">by {item.agent}</p>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">{item.date}</div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <InsightsPanel member={client as any} />
    </div>
  )
}