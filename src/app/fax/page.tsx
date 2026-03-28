
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Printer, CheckCircle2, Clock, AlertCircle, FileText, Send } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function FaxCenterPage() {
  const members = useAppStore((state) => state.members)
  const updateMember = useAppStore(s => s.updateMember)
  
  const faxQueue = members.filter(m => m.ssbciStatus !== 'not-needed')

  const handleBulkFax = () => {
    const pending = faxQueue.filter(m => m.ssbciStatus === 'pending-fax')
    if (pending.length === 0) {
      toast({ title: "Queue Empty", description: "No pending faxes to process." })
      return
    }
    toast({ title: "Bulk Action Initiated", description: `Queuing ${pending.length} fax packages via Documo API...` })
    pending.forEach(m => updateMember(m.id, { ssbciStatus: 'faxed' }))
  }

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full bg-background">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">SSBCI Fax Center</h1>
          </div>
          <Button onClick={handleBulkFax} className="rounded-xl h-9 text-xs font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Send className="w-4 h-4 mr-2" />
            Process Pending Queue
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-2">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pending Generation</p>
              <div className="text-3xl font-black">{faxQueue.filter(m => m.ssbciStatus === 'pending-fax').length}</div>
            </div>
            <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-2">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Transmitted (24h)</p>
              <div className="text-3xl font-black text-primary">{faxQueue.filter(m => m.ssbciStatus === 'faxed').length}</div>
            </div>
            <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-2">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Physician Confirmed</p>
              <div className="text-3xl font-black text-emerald-600">{faxQueue.filter(m => m.ssbciStatus === 'approved').length}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold text-[10px] uppercase h-12 px-6">Member</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase">Physician / PCP</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase">Plan Type</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase">Status</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase px-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faxQueue.map((member) => (
                  <TableRow key={member.id} className="border-border/50">
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm">{member.fullName}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">{member.medicareId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-bold text-foreground">{member.pcpName || 'Missing Physician'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] bg-primary/5 border-primary/20 text-primary">Chronic SNP</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {member.ssbciStatus === 'faxed' ? (
                          <div className="flex items-center gap-1.5 text-primary">
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                            <span className="text-[10px] font-bold uppercase">Sent (Waiting)</span>
                          </div>
                        ) : member.ssbciStatus === 'pending-fax' ? (
                          <div className="flex items-center gap-1.5 text-amber-600">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase">Ready to Transmit</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase">Confirmed</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold rounded-lg border-primary/20 text-primary">
                        <FileText className="w-3.5 h-3.5 mr-1.5" /> Preview Pkg
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
