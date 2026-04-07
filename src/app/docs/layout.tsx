
"use client"

import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ShieldCheck, Activity, PhoneCall, Printer, 
  Link2, Lock, FileSignature, ArrowLeft,
  ChevronRight, BookOpen
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const navItems = [
    { title: "Introduction", items: [
      { label: "Platform Overview", href: "/docs/introduction", icon: BookOpen },
      { label: "HIPAA Security", href: "/docs/hipaa-secure", icon: Lock },
    ]},
    { title: "Core Modules", items: [
      { label: "CMS Switch Detection", href: "/docs/cms-switch", icon: Activity },
      { label: "Maya AI Voice", href: "/docs/maya-voice", icon: PhoneCall },
      { label: "Spruce Health Fax", href: "/docs/spruce-fax", icon: Printer },
      { label: "GHL CRM Sync", href: "/docs/ghl-sync", icon: Link2 },
    ]},
    { title: "Legal & Compliance", items: [
      { label: "Compliance Vault", href: "/docs/compliance-vault", icon: ShieldCheck },
      { label: "BAA Agreement", href: "/docs/baa-agreement", icon: FileSignature },
    ]}
  ]

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Docs Sidebar */}
      <aside className="w-72 border-r border-border bg-card/50 flex flex-col hidden md:flex">
        <div className="h-20 border-b border-border flex items-center px-8 gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-black text-sm">
              M
            </div>
            <span className="text-sm font-black uppercase tracking-tighter">MediStay Docs</span>
          </Link>
        </div>
        
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {navItems.map((group, i) => (
              <div key={i} className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2">
                  {group.title}
                </h4>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link 
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-xl transition-all group",
                          isActive 
                            ? "bg-primary/10 text-primary font-bold shadow-sm" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground/50 group-hover:text-primary")} />
                        <span className="text-xs font-bold uppercase tracking-tight">{item.label}</span>
                        {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-border">
          <Button variant="ghost" size="sm" asChild className="w-full justify-start rounded-xl font-black uppercase text-[10px] tracking-widest">
            <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Command Center</Link>
          </Button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto selection:bg-primary/10 relative">
        <div className="max-w-4xl mx-auto py-20 px-8 lg:px-12">
          {children}
        </div>
        
        {/* Simple Footer */}
        <footer className="max-w-4xl mx-auto px-8 lg:px-12 py-12 border-t border-border flex justify-between items-center opacity-50">
          <p className="text-[10px] font-black uppercase tracking-widest italic">© 2025 MediStay Compliance</p>
          <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest">
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
            <Link href="/terms" className="hover:text-primary">Terms</Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
