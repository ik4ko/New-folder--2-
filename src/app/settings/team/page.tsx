
"use client"

import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users2, Plus, Save, MoreVertical } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function TeamSettingsPage() {
  const router = useRouter()
  const { agencyProfile, brokers, addBroker, updateBroker } = useAppStore()

  const handleSave = () => {
    toast({ title: "Roster Saved", description: "Broker details and commission splits updated." })
  }

  const handleAddUser = () => {
    addBroker({ name: "New Associate", role: "broker", email: "", npn: "" })
    toast({ title: "Slot Created", description: "New broker placeholder added to team." })
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground uppercase tracking-tighter">Team & Splits</h1>
        </div>
        <div className="flex items-center gap-6">
          <Button variant="ghost" className="rounded-xl h-10 font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground" onClick={() => router.push('/dashboard')}>
            Discard
          </Button>
          <Button onClick={handleSave} className="rounded-2xl h-11 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 px-8 shadow-xl shadow-primary/20 text-white text-[10px] gap-2">
            <Save className="w-4 h-4" />
            Save Team Changes
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-5xl mx-auto w-full space-y-12">
        <div className="space-y-2">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
            <Users2 className="w-4 h-4" />
            Hierarchy Management
          </h2>
          <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Manage permissions and NPNs for your roster.</p>
        </div>

        <Card className="rounded-[2.5rem] border border-border shadow-sm bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 p-8">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-tight">Active Producers</CardTitle>
            </div>
            {!agencyProfile.isSolo && (
              <Button onClick={handleAddUser} size="sm" className="rounded-2xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white text-[10px] h-11 px-6 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" /> Add Broker
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-none">
                  <TableHead className="font-black text-[10px] uppercase px-10 text-foreground h-14">Broker Account</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-foreground">Designation</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-foreground">NPN (Licensed)</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-foreground text-right px-10">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokers.map((broker) => (
                  <TableRow key={broker.id} className="border-border/50 hover:bg-muted/20 transition-colors">
                    <TableCell className="px-10 py-6">
                      <div className="flex flex-col gap-2">
                        <Input 
                          value={broker.name} 
                          onChange={(e) => updateBroker(broker.id, { name: e.target.value })}
                          className="h-8 border-none bg-transparent font-black text-sm text-foreground uppercase p-0 focus-visible:ring-0"
                        />
                        <Input 
                          value={broker.email} 
                          onChange={(e) => updateBroker(broker.id, { email: e.target.value })}
                          className="h-6 border-none bg-transparent text-[10px] text-muted-foreground lowercase font-black italic opacity-60 p-0 focus-visible:ring-0"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest border-border bg-white text-foreground px-3">
                        {broker.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={broker.npn} 
                        onChange={(e) => updateBroker(broker.id, { npn: e.target.value })}
                        className="h-8 border-none bg-transparent font-mono text-xs font-black text-primary p-0 focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell className="text-right px-10">
                      <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 hover:bg-primary/5">
                        <MoreVertical className="w-4 h-4 text-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
