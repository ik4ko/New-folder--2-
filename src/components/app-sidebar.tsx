
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
  Banknote,
  GraduationCap
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { LanguageSelector } from "@/components/language-selector"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Logo } from "./logo"
import { useTranslation } from "@/lib/i18n"

export function AppSidebar({ forceOpen = false }: { forceOpen?: boolean }) {
  const pathname = usePathname()
  const isOpen = true
  const { t } = useTranslation()

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('common.dashboard'), desc: 'Real-time monitoring' },
    { href: '/members', icon: Users, label: t('common.members'), desc: 'Personal book of business' },
    { href: '/accounting', icon: Banknote, label: t('common.accounting'), desc: 'Commissions & Splits' },
    { href: '/fax', icon: Printer, label: t('common.fax'), desc: 'Clinical documentation' },
    { href: '/check-ins', icon: PhoneCall, label: t('common.checkins'), desc: 'Maya AI outreach' },
    { href: '/ghl', icon: Link2, label: t('common.ghl'), desc: 'GHL Integration' },
    { href: '/compliance', icon: ShieldCheck, label: t('common.vault'), desc: 'Secure PHI archive' },
    { href: '/ai', icon: Sparkles, label: t('common.ai'), isSpecial: true, desc: 'Predictive churn' },
  ]

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "flex flex-col bg-card border-r border-border h-full shrink-0 z-50 overflow-hidden transition-all duration-300 ease-in-out relative",
        isOpen ? "w-64" : "w-16"
      )}>
        {/* Brand Header */}
        <div className={cn("p-4 flex items-center shrink-0 h-16 border-b border-border", isOpen ? "justify-between" : "justify-center px-0")}>
          {isOpen ? (
            <Link href="/dashboard" className="flex items-center gap-2">
              <Logo className="scale-90" />
            </Link>
          ) : (
            <Logo iconOnly className="scale-75" />
          )}
        </div>

        {/* Main Nav */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide pt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link 
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-xl transition-all duration-200 group",
                      isOpen ? "px-3 py-2.5 gap-3" : "justify-center py-3",
                      isActive 
                        ? "bg-primary/10 text-primary font-bold shadow-sm" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {isOpen && (
                      <span className="text-[11px] font-bold uppercase tracking-widest truncate">{item.label}</span>
                    )}
                  </Link>
                </TooltipTrigger>
                {!isOpen && (
                  <TooltipContent side="right">
                    <p className="font-bold text-xs uppercase">{item.label}</p>
                    <p className="text-[10px] opacity-70">{item.desc}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>

        {/* Academy Shortcut */}
        <div className="px-3 pb-4">
          <Button variant="ghost" className={cn("w-full rounded-xl justify-start gap-3 text-muted-foreground hover:text-primary hover:bg-primary/5 px-3", !isOpen && "justify-center px-0")}>
            <GraduationCap className="w-5 h-5" />
            {isOpen && <span className="text-[11px] font-bold uppercase tracking-widest">Help Center</span>}
          </Button>
        </div>

        {/* CMS Disclaimer Rail */}
        {isOpen && (
          <div className="px-4 py-3 bg-muted/30 border-t border-border">
            <p className="text-[8px] font-bold text-muted-foreground leading-tight uppercase opacity-50">
              Not connected with or endorsed by the U.S. government or the federal Medicare program.
            </p>
          </div>
        )}

        {/* Footer Nav */}
        <div className="p-3 mt-auto border-t border-border space-y-2">
          <div className={cn("flex items-center gap-2", isOpen ? "justify-between px-1" : "justify-center px-0")}>
            <ModeToggle />
            {isOpen && <LanguageSelector align="start" variant="ghost" className="h-8 px-2" />}
          </div>

          <Link 
            href="/settings"
            className={cn(
              "flex items-center rounded-xl transition-all",
              isOpen ? "px-3 py-2.5 gap-3" : "justify-center py-3",
              pathname.startsWith('/settings') ? "bg-muted text-foreground font-bold shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="w-5 h-5" />
            {isOpen && <span className="text-[11px] font-bold uppercase tracking-widest">{t('common.settings')}</span>}
          </Link>
        </div>
      </div>
    </TooltipProvider>
  )
}
