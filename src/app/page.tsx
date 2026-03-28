"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore, initializeStore } from "@/lib/store"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, TrendingDown, Users, Calendar, ArrowUpRight } from "lucide-react"
import Link from "next/link"

export default function Dashboard() {
  const clients = useAppStore((state) => state.clients)

  useEffect(() => {
    initializeStore()
  }, [])

  const churnRisks = clients.filter(c => c.status === 'churn-risk')
  const totalClients = clients.length

  return (
    <div className="flex h-full w-full">
      <CollectionSidebar />
      
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-background">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-headline font-semibold text-primary">Agency Dashboard</h1>
            <p className="text-muted-foreground mt-1">Predictive analytics and client overview</p>
          </div>
          <Badge variant="outline" className="h-8 px-4 text-primary bg-primary/5 border-primary/20 rounded-full font-semibold">
            Agent SCOPE: Active
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingDown className="w-3 h-3 text-red-500" />
                -2% from last month
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60 shadow-sm bg-card border-l-4 border-l-destructive">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Predictive Churn Risks</CardTitle>
              <AlertCircle className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{churnRisks.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Clients needing urgent policy reviews
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Reviews Due (30d)</CardTitle>
              <Calendar className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">14</div>
              <p className="text-xs text-muted-foreground mt-1">
                Proactive scheduling recommended
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-sidebar-accent/30 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-headline font-semibold text-primary">Recent Client Activity</CardTitle>
              <Link href="/clients" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                View all records <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[200px]">Client Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Review Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.slice(0, 5).map((client) => (
                  <TableRow key={client.id} className="hover:bg-sidebar-accent/10">
                    <TableCell className="font-medium">{client.fullName}</TableCell>
                    <TableCell>
                      <Badge variant={client.status === 'churn-risk' ? 'destructive' : 'secondary'} className="rounded-md uppercase text-[10px]">
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(client.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {client.lastReviewDate}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/clients/${client.id}`} className="text-primary hover:underline text-xs font-semibold">
                        Edit Record
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {clients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No client records found. Create your first lead.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}