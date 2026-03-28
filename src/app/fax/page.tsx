
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Printer, CheckCircle2, Clock, AlertCircle, FileText, Send, RefreshCw, PhoneForwarded, ShieldAlert } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function FaxCenterPage() {
  const members = useAppStore((state) => state.members)
  const updateMember = useAppStore(s => s.updateMember)
  
  // SSBCI is for chronic SNP members
  const faxQueue = members.filter(m => m.ssbciStatus !== 'not-needed')

  const handleBulkFax = () => {
    const pending = faxQueue.filter(m => m.ssbciStatus === 'pending-fax')
    if (pending.length === 0) {
      toast({ title: "Queue Empty", description: "No pending faxes to process." })
      return
    }
    toast({ title: "Bulk Action Initiated", description: `Queuing ${pending.length} HIPAA packages via Documo API...` })
    pending.forEach(m => {
      setTimeout(() => {
        updateMember(m.id, { ssbciStatus: 'faxed' })
      }, 1000)
    })
  }

  const handlePreview = (name: string) => {
    toast({ title: "Generating PDF Preview", description: `Creating SSBCI package for ${name}...` })
  }

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">SSBCI Fax Agent</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Module 3: Chronic Care Accelerator</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-2xl h-10 text-xs font-bold border-primary/20">
              <RefreshCw className="w-4 h-4 mr-2" /> Sync Documo
            </Button>
            <Button onClick={handleBulkFax} className="rounded-2xl h-10 text-xs font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Send className="w-4 h-4 mr-2" />
              Transmit All Pending
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#F7F4F0]/30 dark:bg-background">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-3xl border-none shadow-sm bg-card">
              <CardContent className="pt-6 space-y-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Awaiting Generation</p>
                <div className="flex items-end justify-between">
                  <div className="text-4xl font-black">{faxQueue.filter(m => m.ssbciStatus === 'pending-fax').length}</div>
                  <Badge className="bg-amber-100 text-amber-700 border-none mb-1 font-bold px-3">High Priority</Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm bg-card">
              <CardContent className="pt-6 space-y-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">In Transit (SFTP/Fax)</p>
                <div className="flex items-end justify-between">
                  <div className="text-4xl font-black text-primary">{faxQueue.filter(m => m.ssbciStatus === 'faxed').length}</div>
                  <div className="text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-tighter">Avg 4.2m latency</div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm bg-card">
              <CardContent className="pt-6 space-y-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Provider Confirmed</p>
                <div className="flex items-end justify-between">
                  <div className="text-4xl font-black text-emerald-600">{faxQueue.filter(m => m.ssbciStatus === 'approved').length}</div>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 mb-1">
                    <CheckCircle2 className="w-3 h-3" /> 100% HIPAA Logged
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b px-8 py-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                SSBCI Ingestion & Transmission Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20 border-none">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest h-12 px-8">Beneficiary</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Provider / PCP</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Plan Designation</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Status Tracking</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase tracking-widest px-8">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faxQueue.length > 0 ? faxQueue.map((member) => (
                    <TableRow key={member.id} className="border-border/50 group hover:bg-slate-50/50">
                      <TableCell className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-sm">{member.fullName}</span>
                          <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">{member.medicareId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                            <PhoneForwarded className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{member.pcpName || 'Missing Physician'}</p>
                            <p className="text-[9px] text-muted-foreground font-medium italic">Confirmed FAX # available</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-primary/5 border-primary/20 text-primary px-2">
                          {member.planName.includes('HMO') ? 'C-HMO' : 'Chronic SNP'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {member.ssbciStatus === 'faxed' ? (
                            <div className="flex items-center gap-2 text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                              <Clock className="w-3.5 h-3.5 animate-spin" />
                              <span className="text-[9px] font-black uppercase tracking-tighter">Transmitted (Wait)</span>
                            </div>
                          ) : member.ssbciStatus === 'pending-fax' ? (
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-black uppercase tracking-tighter">Ready to Gen</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-black uppercase tracking-tighter">Rx Confirmed</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-8">
                        <Button onClick={() => handlePreview(member.fullName)} variant="ghost" size="sm" className="h-9 px-4 text-[10px] font-bold rounded-xl border border-border group-hover:border-primary/30 group-hover:text-primary transition-all">
                          <FileText className="w-3.5 h-3.5 mr-2 opacity-60" /> Preview Package
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-medium">No chronic care members currently in transmission queue.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="p-10 rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary shadow-inner">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Module 3 Compliance Lock</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                All SSBCI faxes are transmitted via Documo's HIPAA-encrypted SFTP bridge. Packages include pre-filled Medicare Part C chronic condition verification forms. Audit trails are archived for 10 years.
              </p>
              <Button variant="link" className="text-xs font-bold text-primary underline-offset-4">Review HIPAA Transmission Logs</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
