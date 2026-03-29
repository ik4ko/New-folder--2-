"use client"

import * as React from "react"
import { 
  Users, 
  LayoutDashboard, 
  ShieldCheck, 
  Settings, 
  LogOut,
  Sparkles,
  PhoneCall,
  Printer,
  Link2,
  PanelLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ModeToggle } from "./mode-toggle"
import { useAppStore } from "@/lib/store"

interface NavItemProps {
  href: string
  icon: React.ElementType
  label: string
  isActive?: boolean
  isSpecial?: boolean
}

function NavItem({ href, icon: Icon, label, isActive, isSpecial }: NavItemProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link 
            href={href}
            className={cn(
              "group relative flex items-center justify-center h-12 w-12 transition-all duration-200",
              "before:absolute before:left-[-16px] before:w-1 before:h-2 before:bg-primary before:rounded-r-full before:transition-all before:duration-200",
              isActive ? "before:h-8 before:left-[-12px]" : "hover:before:h-5 hover:before:left-[-12px]"
            )}
          >
            <div className={cn(
              "flex items-center justify-center h-12 w-12 rounded-[24px] transition-all duration-200 overflow-hidden",
              isActive ? "rounded-[16px] bg-primary text-primary-foreground shadow-lg shadow-primary/20" : 
              isSpecial ? "bg-primary/10 text-primary hover:rounded-[16px] hover:bg-primary hover:text-primary-foreground" :
              "bg-muted/50 text-muted-foreground hover:rounded-[16px] hover:bg-primary hover:text-primary-foreground"
            )}>
              <Icon className="w-5 h-5" />
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12} className="font-bold text-xs uppercase tracking-widest">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { toggleSidebar, isSidebarOpen } = useAppStore()

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Command Center' },
    { href: '/members', icon: Users, label: 'Member Roster' },
    { href: '/fax', icon: Printer, label: 'SSBCI Fax Center' },
    { href: '/check-ins', icon: PhoneCall, label: 'AI Check-ins' },
    { href: '/ghl', icon: Link2, label: 'GHL Integration' },
    { href: '/compliance', icon: ShieldCheck, label: 'Compliance Vault' },
    { href: '/ai', icon: Sparkles, label: 'Retention AI', isSpecial: true },
  ]

  return (
    <div className="w-[72px] flex flex-col items-center py-4 bg-sidebar border-r border-sidebar-border h-full shrink-0 z-50 overflow-y-auto scrollbar-hide">
      {/* Retraction Toggle at Top */}
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={toggleSidebar}
              className={cn(
                "mb-4 h-12 w-12 rounded-[16px] bg-muted/50 flex items-center justify-center text-muted-foreground transition-all duration-300 hover:bg-primary hover:text-primary-foreground shadow-sm",
                !isSidebarOpen && "bg-primary/10 text-primary"
              )}
            >
              <PanelLeft className={cn("w-5 h-5 transition-transform duration-300", !isSidebarOpen && "rotate-180")} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="font-bold text-xs uppercase tracking-widest">
            {isSidebarOpen ? "Collapse Roster" : "Expand Roster"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="w-8 h-[2px] bg-muted/50 rounded-full mb-4 shrink-0" />

      {/* Main Nav */}
      <div className="flex flex-col gap-3 flex-1 w-full items-center">
        {navItems.map((item) => (
          <NavItem 
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
            isSpecial={item.isSpecial}
          />
        ))}
      </div>

      {/* Footer Nav */}
      <div className="flex flex-col gap-4 items-center mt-auto pt-4 border-t border-sidebar-border w-full">
        <ModeToggle />
        
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link 
                href="/settings"
                className={cn(
                  "flex items-center justify-center h-12 w-12 rounded-[24px] bg-muted/50 text-muted-foreground transition-all duration-200 hover:rounded-[16px] hover:bg-primary hover:text-primary-foreground",
                  pathname === '/settings' && "rounded-[16px] bg-primary text-primary-foreground"
                )}
              >
                <Settings className="w-5 h-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="font-bold text-xs uppercase tracking-widest">
              Settings
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex items-center justify-center h-12 w-12 rounded-[24px] bg-destructive/5 text-destructive transition-all duration-200 hover:rounded-[16px] hover:bg-destructive hover:text-destructive-foreground">
                <LogOut className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="font-bold text-xs uppercase tracking-widest">
              Sign Out
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
