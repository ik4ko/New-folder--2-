
"use client"

import { Input } from "@/components/ui/input"
import { Search, UserPlus, Filter, ShieldCheck, AlertCircle } from "lucide-react"
import { useAppStore, type MemberRecord } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useState, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

export function CollectionSidebar() {
  const members = useAppStore((state) => state.members)
  const [search, setSearch] = useState("")
  const pathname = usePathname()

  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.medicareId.toLowerCase().includes(search.toLowerCase())
    )
  }, [members, search])

  return (
    <aside className="w-80 border-r border-sidebar-border bg-sidebar flex flex-col h-full z-10 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-sidebar-border space-y-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Member Roster</h2>
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-md shadow-primary/20">
            <Link href="/members/new">
              <UserPlus className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or MBI..." 
            className="pl-9 h-10 bg-background border-border rounded-xl text-sm focus-visible:ring-primary shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="py-4 space-y-1.5">
          {filteredMembers.map((member) => (
            <Link 
              key={member.id}
              href={`/members/${member.id}`}
              className={cn(
                "flex flex-col gap-1.5 p-4 rounded-2xl transition-all duration-200 group relative",
                pathname === `/members/${member.id}` 
                  ? "bg-primary/5 ring-1 ring-primary/10 shadow-sm border-l-4 border-l-primary" 
                  : "bg-transparent hover:bg-muted/50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "font-bold text-sm truncate",
                  pathname === `/members/${member.id}` ? "text-primary" : "text-foreground/80"
                )}>
                  {member.fullName}
                </span>
                {member.status === 'churn-risk' && (
                  <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                <span className="font-mono bg-muted px-1.5 rounded uppercase">{member.medicareId}</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className={cn(
                    "w-3 h-3",
                    member.retentionScore > 80 ? "text-green-500" : member.retentionScore > 50 ? "text-yellow-500" : "text-red-500"
                  )} />
                  <span className="font-bold text-foreground">{member.retentionScore}%</span>
                </span>
              </div>
            </Link>
          ))}
          {filteredMembers.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground text-sm font-medium">No members found.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border bg-muted/30">
        <Button variant="outline" className="w-full justify-center gap-2 h-10 rounded-xl border-dashed border-border text-muted-foreground hover:bg-muted font-bold text-xs transition-all">
          <Filter className="w-4 h-4" />
          Filter by Carrier
        </Button>
      </div>
    </aside>
  )
}
