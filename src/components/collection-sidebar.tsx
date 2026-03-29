"use client"

import { Input } from "@/components/ui/input"
import { Search, UserPlus, Filter, AlertCircle, PanelLeftClose, ChevronLeft } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useState, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

export function CollectionSidebar() {
  const { members, isSidebarOpen, toggleSidebar } = useAppStore()
  const [search, setSearch] = useState("")
  const pathname = usePathname()

  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.medicareId.toLowerCase().includes(search.toLowerCase())
    )
  }, [members, search])

  return (
    <aside className={cn(
      "flex flex-col h-full bg-background border-r border-border shrink-0 z-40 overflow-hidden transition-all duration-300 ease-in-out",
      isSidebarOpen ? "w-[280px]" : "w-0 border-r-0"
    )}>
      {/* Header Area */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-border shrink-0">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
          Member Roster
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all">
            <Link href="/members/new">
              <UserPlus className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted transition-all">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Area */}
      <div className="p-6 pb-2 shrink-0">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search by name or MBI..." 
            className="pl-10 h-11 bg-muted/50 border-none rounded-xl text-sm focus-visible:ring-primary shadow-inner text-foreground font-black uppercase tracking-tight"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-1">
          {filteredMembers.map((member) => (
            <Link 
              key={member.id}
              href={`/members/${member.id}`}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 group",
                pathname === `/members/${member.id}` 
                  ? "bg-primary/5 text-primary" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <div className={cn(
                "w-2 h-2 rounded-full shrink-0 transition-all",
                member.status === 'churn-risk' ? "bg-destructive animate-pulse" : 
                pathname === `/members/${member.id}` ? "bg-primary" : "bg-muted-foreground/30 group-hover:bg-muted-foreground/60"
              )} />
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black truncate leading-tight uppercase tracking-tight">
                  {member.fullName}
                </p>
                <p className="text-[10px] opacity-60 font-mono truncate leading-tight mt-0.5">
                  {member.medicareId}
                </p>
              </div>

              {member.retentionScore < 50 && (
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              )}
            </Link>
          ))}
          {filteredMembers.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-30">No members found.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Area */}
      <div className="p-6 border-t border-border bg-muted/5">
        <Button variant="outline" className="w-full justify-center gap-2 h-11 rounded-xl border-border bg-background text-foreground hover:bg-muted font-black text-[10px] uppercase tracking-widest transition-all">
          <Filter className="w-4 h-4 text-primary" />
          Filter by Carrier
        </Button>
      </div>
    </aside>
  )
}