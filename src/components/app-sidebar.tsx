"use client"

import * as React from "react"
import { 
  Users, 
  ShieldCheck, 
  Settings, 
  LogOut,
  Sparkles,
  PhoneCall,
  Printer,
  Link2,
  LayoutDashboard,
  Shield,
  Moon,
  Sun,
  Banknote,
  PanelLeft,
  Home
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"

export function AppSidebar() {
  const pathname = usePathname()
  const { setTheme, resolvedTheme } = useTheme()
  const { isSidebarOpen, toggleSidebar } = useAppStore()

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Command Center' },
    { href: '/members', icon: Users, label: 'Member Roster' },
    { href: '/accounting', icon: Banknote, label: 'Agency Accounting' },
    { href: '/fax', icon: Printer, label: 'SSBCI Fax Center' },
    { href: '/check-ins', icon: PhoneCall, label: 'AI Check-ins' },
    { href: '/ghl', icon: Link2, label: 'GHL Integration' },
    { href: '/compliance', icon: ShieldCheck, label: 'Compliance Vault' },
    { href: '/ai', icon: Sparkles, label: 'Retention AI', isSpecial: true },
  ]

  return (
    <div className="w-64 flex flex-col bg-sidebar border-r border-sidebar-border h-full shrink-0 z-50 overflow-hidden">
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary/20">
            M
          </div>
          <span className="text-lg font-black tracking-tight text-foreground uppercase">MediStay</span>
        </Link>
        {!isSidebarOpen && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground">
            <PanelLeft className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide pt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group border border-transparent",
                isActive 
                  ? "bg-primary/5 text-primary font-black shadow-sm border-primary/10" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer Nav */}
      <div className="p-4 mt-auto border-t border-sidebar-border space-y-1">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-1">Live Sync</span>
          </div>
          <ModeToggle />
        </div>

        <Link 
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px] font-black uppercase tracking-widest">Public Site</span>
        </Link>

        <Link 
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
            pathname.startsWith('/settings') ? "bg-muted text-foreground font-black border border-border" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[11px] font-black uppercase tracking-widest">Agency Settings</span>
        </Link>

        {/* HIPAA Box */}
        <div className="mt-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Shield className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">HIPAA SECURE</span>
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed font-bold uppercase tracking-tight opacity-60">
            BAA Active: AWS/Twilio/Documo. Records encrypted at rest.
          </p>
        </div>
      </div>
    </div>
  )
}
