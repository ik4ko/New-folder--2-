"use client"

import { Input } from "@/components/ui/input"
import { Search, UserPlus, Filter } from "lucide-react"
import { useAppStore, type ClientRecord } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useState, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

export function CollectionSidebar() {
  const clients = useAppStore((state) => state.clients)
  const [search, setSearch] = useState("")
  const pathname = usePathname()

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.fullName.toLowerCase().includes(search.toLowerCase())
    )
  }, [clients, search])

  return (
    <aside className="w-80 border-r border-border bg-sidebar-accent/20 flex flex-col h-full z-10 overflow-hidden">
      <div className="p-4 border-b border-border space-y-4 bg-background/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-headline font-semibold text-primary">Clients</h2>
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/clients/new">
              <UserPlus className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search records..." 
            className="pl-9 h-9 bg-background border-border/60 rounded-xl text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredClients.map((client) => (
            <Link 
              key={client.id}
              href={`/clients/${client.id}`}
              className={cn(
                "flex flex-col gap-1 p-3 rounded-xl transition-all duration-200 hover:bg-sidebar-accent",
                pathname === `/clients/${client.id}` ? "bg-sidebar-accent ring-1 ring-primary/20 shadow-sm" : "bg-transparent"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm truncate">{client.fullName}</span>
                <Badge 
                  variant={client.status === 'churn-risk' ? 'destructive' : 'secondary'}
                  className="text-[10px] h-4 px-1 rounded-sm uppercase tracking-tighter"
                >
                  {client.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Age: {client.age}</span>
                <span>Updated: {new Date(client.updatedAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
          {filteredClients.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No clients found.
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-sidebar-accent/10">
        <Button variant="outline" className="w-full justify-start gap-2 h-9 rounded-xl border-dashed border-primary/40 text-primary hover:bg-primary/5">
          <Filter className="w-4 h-4" />
          Advanced Filters
        </Button>
      </div>
    </aside>
  )
}