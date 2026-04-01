"use client"

import * as React from "react"
import { 
  Users, 
  ShieldCheck, 
  Settings, 
  Sparkles,
  PhoneCall,
  Printer,
  Link2,
  LayoutDashboard,
  Home,
  PanelLeft,
  PanelLeftClose,
  Shield,
  Search,
  Info,
  ChevronLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function AppSidebar() {
  const pathname = usePathname()
  const { isSidebarOpen, toggleSidebar } = useAppStore()

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Command Center', desc: 'Real-time monitoring' },
    { href: '/members', icon: Users, label: 'Member Roster', desc: 'Personal book of business' },
    { href: '/accounting', icon: Printer, label: 'Accounting', desc: 'Commissions' },
    { href: '/fax', icon: Printer, label: 'SSBCI Fax', desc: 'Clinical documentation' },
    { href: '/check-ins', icon: PhoneCall, label: 'AI Check-ins', desc: 'Maya AI outreach' },
    { href: '/ghl', icon: Link2, label: 'CRM Sync', desc: 'GHL Integration' },
    { href: '/compliance', icon: ShieldCheck, label: 'Vault', desc: 'Secure PHI archive' },
    { href: '/ai', icon: Sparkles, label: 'Retention AI', isSpecial: true, desc: 'Predictive churn' },
  ]

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border h-full shrink-0 z-50 overflow-hidden transition-all duration-300 ease-in-out relative",
        isSidebarOpen ? "w-60" : "w-16"
      )}>
        {/* Brand Header */}
        <div className={cn("p-5 flex items-center shrink-0 h-16 border-b border-sidebar-border", isSidebarOpen ? "justify-between" : "justify-center px-0")}>
          {isSidebarOpen ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white font-black text-sm shadow-lg shadow-primary/20">
                  M
                </div>
                <span className="text-md font-black tracking-tight text-foreground uppercase">medistay.ai</span>
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => {
                  e.preventDefault();
                  toggleSidebar();
                }} 
                className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground transition-transform active:scale-95"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.preventDefault();
                toggleSidebar();
              }} 
              className="h-10 w-10 rounded-xl hover:bg-muted text-primary transition-transform active:scale-95"
            >
              <PanelLeft className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Search Shortcut (Visible when collapsed) */}
        {!isSidebarOpen && (
          <div className="px-3 py-2 flex justify-center mt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted">
                  <Search className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Quick Search (⌘K)</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Main Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-hide pt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link 
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-xl transition-all duration-200 group border border-transparent",
                      isSidebarOpen ? "px-3 py-2.5 gap-3" : "justify-center py-3",
                      isActive 
                        ? "bg-primary/5 text-primary font-black shadow-sm border-primary/10" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("w-4.5 h-4.5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {isSidebarOpen && (
                      <span className="text-[10px] font-black uppercase tracking-widest truncate">{item.label}</span>
                    )}
                  </Link>
                </TooltipTrigger>
                {!isSidebarOpen && (
                  <TooltipContent side="right">
                    <p className="font-bold">{item.label}</p>
                    <p className="text-[9px] opacity-70">{item.desc}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>

        {/* Footer Nav */}
        <div className="p-3 mt-auto border-t border-sidebar-border space-y-1">
          <div className={cn("flex items-center px-3 py-1.5", isSidebarOpen ? "justify-between" : "justify-center px-0")}>
            {isSidebarOpen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-help">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Live Sync</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">CMS MARx Bridge: Connected</TooltipContent>
              </Tooltip>
            )}
            <ModeToggle />
          </div>

          <Link 
            href="/"
            className={cn(
              "flex items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all",
              isSidebarOpen ? "px-3 py-2.5 gap-3" : "justify-center py-3"
            )}
          >
            <Home className="w-4.5 h-4.5" />
            {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Public Site</span>}
          </Link>

          <Link 
            href="/settings"
            className={cn(
              "flex items-center rounded-xl transition-all",
              isSidebarOpen ? "px-3 py-2.5 gap-3" : "justify-center py-3",
              pathname.startsWith('/settings') ? "bg-muted text-foreground font-black border border-border" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="w-4.5 h-4.5" />
            {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Settings</span>}
          </Link>

          {/* HIPAA & CMS Compliance Box */}
          {isSidebarOpen ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-2 p-3 rounded-2xl bg-muted/30 border border-border/50 cursor-help">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <Shield className="w-2.5 h-2.5" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Individual Agent Mode</span>
                  </div>
                  <p className="text-[7px] text-muted-foreground leading-tight font-bold uppercase tracking-tight opacity-60">
                    This product uses the Blue Button 2.0 API but is not a CMS service.
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] p-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Info className="w-3 h-3" />
                    <p className="font-bold text-[9px] uppercase">CMS Disclaimer</p>
                  </div>
                  <p className="text-[8px] leading-relaxed opacity-80 uppercase font-bold">
                    Blue Button 2.0 is a registered trademark of CMS. MediStay provides autonomous synchronization for independent licensed agents.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center py-2">
                  <Shield className="w-4 h-4 text-muted-foreground opacity-50" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">Individual Agent Compliance Mode</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
