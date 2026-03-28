
"use client"

import * as React from "react"
import { 
  Users, 
  LayoutDashboard, 
  ShieldCheck, 
  Settings, 
  LogOut,
  Sparkles,
  Lock,
  PhoneCall,
  Printer,
  Link2
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { SyncStatus } from "./sync-status"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { ModeToggle } from "./mode-toggle"

export function AppSidebar() {
  const pathname = usePathname()
  const isGHLConnected = useAppStore(s => s.isGHLConnected)

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar shadow-xl z-20">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border bg-muted/30">
        <div className="flex items-center gap-3 px-4 w-full">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg shadow-primary/20">
            M
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground truncate group-data-[collapsible=icon]:hidden">
            MediStay
          </span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="py-6 bg-sidebar">
        <SidebarMenu className="gap-2 px-3">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Dashboard" className="rounded-xl h-10 px-4 transition-all">
              <Link href="/">
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium">Command Center</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/members')} tooltip="Members" className="rounded-xl h-10 px-4 transition-all">
              <Link href="/members">
                <Users className="w-5 h-5" />
                <span className="font-medium">Member Roster</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/fax'} tooltip="SSBCI Fax Agent" className="rounded-xl h-10 px-4 transition-all">
              <Link href="/fax">
                <Printer className="w-5 h-5" />
                <span className="font-medium">SSBCI Fax Center</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/check-ins'} tooltip="AI Check-in Calls" className="rounded-xl h-10 px-4 transition-all">
              <Link href="/check-ins">
                <PhoneCall className="w-5 h-5" />
                <span className="font-medium">AI Check-ins</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarSeparator className="my-4 mx-2" />
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/ghl'} tooltip="GHL Sync" className={`rounded-xl h-10 px-4 transition-all ${isGHLConnected ? "text-green-600 bg-green-50 dark:bg-green-950/30" : ""}`}>
              <Link href="/ghl">
                <Link2 className="w-5 h-5" />
                <span className="font-medium">GHL Integration</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/compliance'} tooltip="Compliance" className="rounded-xl h-10 px-4 transition-all">
              <Link href="/compliance">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-medium">Compliance Vault</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/ai'} tooltip="AI Assistant" className="rounded-xl h-10 px-4 transition-all bg-primary/10 text-primary hover:bg-primary/20 border border-primary/10">
              <Link href="/ai">
                <Sparkles className="w-5 h-5" />
                <span className="font-bold">Retention AI</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 bg-muted/30">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:hidden mb-4">
          <SyncStatus />
          <ModeToggle />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings" className="rounded-xl h-9">
              <Settings className="w-4 h-4" />
              <span className="text-xs">Agency Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="rounded-xl h-9 text-destructive hover:text-destructive hover:bg-destructive/10" tooltip="Log out">
              <LogOut className="w-4 h-4" />
              <span className="text-xs">Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <div className="mt-4 p-3 rounded-xl bg-card border border-sidebar-border text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 mb-1.5">
            <Lock className="w-3 h-3 text-primary" />
            <span className="font-bold text-foreground uppercase tracking-widest text-[9px]">HIPAA SECURE</span>
          </div>
          BAA Active: AWS/Twilio/Documo. Records encrypted at rest.
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
