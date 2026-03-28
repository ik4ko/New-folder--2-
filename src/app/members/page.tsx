
"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Filter, ShieldCheck, MoreHorizontal, UserPlus, FileDown } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"
import { toast } from "@/hooks/use-toast"

export default function MemberRosterPage() {
  const members = useAppStore((state) => state.members)
  const [search, setSearch] = useState("")

  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.medicareId.toLowerCase().includes(search.toLowerCase())
    )
  }, [members, search])

  const handleExport = () => {
    toast({ title: "Exporting Roster", description: "Generating encrypted CSV for agency records..." })
    setTimeout(() => {
      toast({ title: "Export Successful", description: "CSV file has been downloaded." })
    }, 1500)
  }

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full bg-background">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <h1 className="text-xl font-bold text-foreground">Member Roster</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl h-9 text-xs font-bold" onClick={handleExport}>
              <FileDown className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button className="rounded-xl h-9 text-xs font-bold bg-secondary hover:bg-secondary/90 shadow-sm" asChild>
              <Link href="/members/new">
                <UserPlus className="w-4 h-4 mr-2" /> Enroll New
              </Link>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search full roster by name or MBI..." 
                className="pl-9 h-10 rounded-xl bg-card border-border/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl h-10 gap-2 border-dashed">
                <Filter className="w-4 h-4 text-primary" /> Carrier
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl h-10 gap-2 border-dashed">
                <Filter className="w-4 h-4 text-primary" /> Risk Level
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-none">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest h-12 px-6">Member</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Plan & Carrier</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Enrollment</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest">Score</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest px-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length > 0 ? filteredMembers.map((member) => (
                  <TableRow key={member.id} className="hover:bg-primary/5 transition-colors border-border/50">
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm">{member.fullName}</span>
                        <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">{member.medicareId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">{member.carrier}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{member.planName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest border-primary/20 bg-primary/5 text-primary">
                        {member.enrollmentPeriod}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={member.status === 'churn-risk' ? 'destructive' : 'secondary'} 
                        className="rounded-md uppercase text-[8px] px-2 py-0.5 font-bold"
                      >
                        {member.status === 'churn-risk' ? 'Switch Detected' : 'Shielded'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${member.retentionScore > 80 ? 'bg-emerald-500' : member.retentionScore > 50 ? 'bg-amber-500' : 'bg-destructive'}`} />
                        <span className="text-[10px] font-black text-foreground/80">{member.retentionScore}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="outline" size="sm" asChild className="h-8 text-[10px] font-black uppercase tracking-tighter border-primary/20 text-primary hover:bg-primary/5 rounded-lg transition-all">
                          <Link href={`/members/${member.id}`}>Details</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium">
                      No members matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
