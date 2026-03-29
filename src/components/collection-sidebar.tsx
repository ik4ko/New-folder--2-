
"use client"

import { Input } from "@/components/ui/input"
import { Search, UserPlus, Filter, AlertCircle, PanelLeftClose } from "lucide-react"
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
      "flex flex-col h-full bg-secondary/30 border-r border-sidebar-border shrink-0 z-40 overflow-hidden transition-all duration-300 ease-in-out",
      isSidebarOpen ? "w-[240px]" : "w-0 border-r-0"
    )}>
      {/* Header Area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border bg-sidebar/50 backdrop-blur-sm shrink-0">
        <h2 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2 whitespace-nowrap">
          Member Roster
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors">
            <Link href="/members/new">
              <UserPlus className="h-4 w-4" />
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Area */}
      <div className="p-3 shrink-0">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Quick search..." 
            className="pl-9 h-8 bg-background/50 border-none rounded-lg text-xs focus-visible:ring-primary shadow-inner text-foreground font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5">
          {filteredMembers.map((member) => (
            <Link 
              key={member.id}
              href={`/members/${member.id}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group",
                pathname === `/members/${member.id}` 
                  ? "bg-primary/10 text-primary shadow-sm" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0 transition-all",
                member.status === 'churn-risk' ? "bg-destructive animate-pulse" : 
                pathname === `/members/${member.id}` ? "bg-primary" : "bg-muted-foreground/30 group-hover:bg-muted-foreground/60"
              )} />
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate leading-tight">
                  {member.fullName}
                </p>
                <p className="text-[10px] opacity-60 font-mono truncate leading-tight">
                  {member.medicareId}
                </p>
              </div>

              {member.retentionScore < 50 && (
                <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
              )}
            </Link>
          ))}
          {filteredMembers.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-30">Empty Roster</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border bg-sidebar/30 shrink-0">
        <Button variant="outline" className="w-full justify-start gap-2 h-8 rounded-lg border-dashed border-border bg-background/50 text-muted-foreground hover:bg-muted font-bold text-[10px] uppercase tracking-widest transition-all">
          <Filter className="w-3 h-3" />
          Carrier Filter
        </Button>
      </div>
    </aside>
  )
}
