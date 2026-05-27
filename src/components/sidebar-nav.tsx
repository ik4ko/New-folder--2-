"use client"

import * as React from "react"
import {
  LayoutDashboard, Users, FileCheck, Radar, Megaphone,
  UserPlus, Shield, Lock, Settings, LifeBuoy, LogOut, Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Logo } from "./logo"
import { useAppStore } from '@/lib/store'
import { languages } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'

type NavItem = { href: string; icon: React.ElementType; label: string; desc: string; badge?: number }

const CORE_NAV: NavItem[] = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard',            desc: 'Real-time monitoring' },
  { href: '/dashboard/book',         icon: Users,           label: 'Book of Business',     desc: 'Monitored clients' },
  { href: '/dashboard/alerts',         icon: Bell,     label: 'Alerts',        desc: 'Switch & plan change alerts' },
  { href: '/dashboard/churn/upload',  icon: Radar,    label: 'Upload Roster', desc: 'Upload roster CSV' },
  { href: '/dashboard/vcc',           icon: FileCheck, label: 'VCC Forms',    desc: 'Doctor-signed carrier forms' },
  { href: '/dashboard/campaigns',     icon: Megaphone, label: 'Campaigns',    desc: 'Maya AI outreach campaigns' },
  { href: '/dashboard/aor',           icon: Lock,      label: 'Aegis Lock',   desc: 'AOR fulfillment CMS-1696' },
]

const STAFF_MGMT_NAV: NavItem[] = [
  { href: '/dashboard/team',    icon: UserPlus, label: 'Team',         desc: 'Manage brokers' },
  { href: '/dashboard/manager', icon: Shield,   label: 'Manager View', desc: 'Agency-wide oversight' },
]

const FOOTER_NAV: NavItem[] = [
  { href: '/settings', icon: Settings, label: 'Settings', desc: 'Workspace settings' },
]

function NavLink({ item, isActive, isOpen }: { item: NavItem; isActive: boolean; isOpen: boolean }) {
  const showBadge = (item.badge ?? 0) > 0
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={item.href}
          className={cn(
            "flex items-center rounded-xl transition-all duration-150 group relative",
            isOpen ? "px-3 py-2.5 gap-3" : "justify-center py-3",
            isActive
              ? "bg-primary/10 text-primary font-bold shadow-sm"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          )}
        >
          <div className="relative shrink-0">
            <item.icon className={cn(
              "w-5 h-5",
              isActive ? "text-primary" : "text-slate-400 group-hover:text-white"
            )} />
            {showBadge && !isOpen && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-red-500 text-[8px] font-black text-white flex items-center justify-center px-0.5">
                {(item.badge ?? 0) > 99 ? '99+' : item.badge}
              </span>
            )}
          </div>
          {isOpen && (
            <>
              <span className="text-[11px] font-bold uppercase tracking-widest truncate flex-1">{item.label}</span>
              {showBadge && (
                <span className="min-w-[18px] h-4 rounded-full bg-red-500 text-[8px] font-black text-white flex items-center justify-center px-1">
                  {(item.badge ?? 0) > 99 ? '99+' : item.badge}
                </span>
              )}
            </>
          )}
        </a>
      </TooltipTrigger>
      {!isOpen && (
        <TooltipContent side="right">
          <p className="font-bold text-xs uppercase">{item.label}</p>
          <p className="text-[10px] opacity-70">{item.desc}</p>
        </TooltipContent>
      )}
    </Tooltip>
  )
}

interface SidebarNavProps {
  isStaff: boolean
  role: string
  name: string
  email: string
  criticalAlerts?: number
}

export function SidebarNav({ isStaff, role, name, email, criticalAlerts = 0 }: SidebarNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isOpen = true
  const { language, setLanguage } = useAppStore()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname?.startsWith(href) ?? false

  const coreNav = CORE_NAV.map(item => {
    if (item.href === '/dashboard/alerts')
      return { ...item, badge: criticalAlerts > 0 ? criticalAlerts : undefined }
    return item
  })

  const roleLabel =
    role === 'agency_owner' ? 'Owner'
    : role === 'agency_admin' ? 'Manager'
    : role === 'customer_service' ? 'CS'
    : role === 'solo_broker' ? 'Solo Broker'
    : 'Broker'

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "flex flex-col bg-slate-950 border-r border-white/10 h-full shrink-0 z-50 overflow-hidden transition-all duration-300 ease-in-out relative",
        isOpen ? "w-64" : "w-16"
      )}>
        {/* Brand */}
        <div className={cn("p-4 flex items-center shrink-0 h-16 border-b border-white/10", isOpen ? "justify-between" : "justify-center px-0")}>
          {isOpen ? (
            <a href="/dashboard" className="flex items-center gap-2">
              <Logo className="scale-90" />
            </a>
          ) : (
            <Logo iconOnly className="scale-75" />
          )}
        </div>

        {/* Main Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pt-4">
          {coreNav.map(item => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} isOpen={isOpen} />
          ))}

          {/* Staff-only: Team + Manager View */}
          {isStaff && (
            <>
              <div className={cn("pt-4 pb-2", isOpen ? "px-3" : "flex justify-center")}>
                {isOpen ? (
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Management</p>
                ) : (
                  <div className="w-4 h-px bg-white/10" />
                )}
              </div>
              {STAFF_MGMT_NAV.map(item => (
                <NavLink key={item.href} item={item} isActive={isActive(item.href)} isOpen={isOpen} />
              ))}
            </>
          )}
        </nav>

        {/* CMS Disclaimer */}
        {isOpen && (
          <div className="px-4 py-3 border-t border-white/5">
            <p className="text-[8px] font-bold text-slate-600 leading-tight uppercase">
              Not connected with or endorsed by the U.S. government or the federal Medicare program.
            </p>
          </div>
        )}

        {/* Footer Nav */}
        <div className="p-3 border-t border-white/10 space-y-0.5">
          {FOOTER_NAV.map(item => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} isOpen={isOpen} />
          ))}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/support"
                className={cn(
                  "flex items-center rounded-xl transition-all duration-150 group text-slate-400 hover:bg-white/5 hover:text-white",
                  isOpen ? "px-3 py-2.5 gap-3" : "justify-center py-3"
                )}
              >
                <LifeBuoy className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-white" />
                {isOpen && <span className="text-[11px] font-bold uppercase tracking-widest">Support</span>}
              </Link>
            </TooltipTrigger>
            {!isOpen && (
              <TooltipContent side="right">
                <p className="font-bold text-xs uppercase">Support</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* User Profile Dropdown */}
        <div className="p-3 border-t border-white/10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "w-full flex items-center rounded-xl transition-all duration-150 hover:bg-white/5 group",
                isOpen ? "px-3 py-2.5 gap-3" : "justify-center py-3"
              )}>
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-black shrink-0">
                  {name?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>
                {isOpen && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[11px] font-bold text-white truncate">{name}</p>
                    <p className="text-[9px] text-slate-500 truncate">{email}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" sideOffset={8}
              className="w-60 rounded-2xl p-2 bg-slate-900 border-slate-700 shadow-2xl">
              <DropdownMenuLabel className="px-3 py-2">
                <p className="text-sm font-bold text-white">{name}</p>
                <p className="text-[10px] text-slate-400">{email}</p>
                <span className="mt-1.5 inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  {roleLabel}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              <div className="px-3 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Language</p>
                <div className="flex gap-1.5">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as any)}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        language === lang.code
                          ? "bg-primary/20 text-primary"
                          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                      )}
                    >
                      {lang.code.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="mx-1 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer gap-2 font-bold text-[11px] uppercase tracking-widest"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  )
}
