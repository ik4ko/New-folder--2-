"use client"

import * as React from "react"
import { 
  Users, 
  LayoutDashboard, 
  FileText, 
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

export function AppSidebar() {
  const pathname = usePathname()
  const isGHLConnected = useAppStore(s => s.isGHLConnected)

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar shadow-xl z-20">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-4 w-full">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
            M
          </div>
          <span className="font-headline font-semibold text-primary truncate group-data-[collapsible=icon]:hidden">
            MediStay
          </span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="py-6">
        <SidebarMenu className="gap-2 px-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Dashboard">
              <Link href="/">
                <LayoutDashboard className="w-5 h-5" />
                <span>Agency Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/members')} tooltip="Members">
              <Link href="/members">
                <Users className="w-5 h-5" />
                <span>Member Roster</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="SSBCI Fax Agent">
              <Printer className="w-5 h-5" />
              <span>SSBCI Fax Center</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="AI Check-in Calls">
              <PhoneCall className="w-5 h-5" />
              <span>AI Check-ins</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarSeparator className="my-2" />
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="GHL Sync" className={isGHLConnected ? "text-green-600" : ""}>
              <Link2 className="w-5 h-5" />
              <span>GHL Integration</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Compliance">
              <ShieldCheck className="w-5 h-5" />
              <span>Compliance Vault</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="AI Assistant">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="text-accent font-semibold">Retention AI</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 bg-sidebar-accent/30">
        <div className="group-data-[collapsible=icon]:hidden mb-4">
          <SyncStatus />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="text-destructive hover:text-destructive" tooltip="Log out">
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <div className="mt-4 p-3 rounded-xl bg-card border border-border/50 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-3 h-3 text-primary" />
            <span className="font-semibold text-foreground uppercase tracking-wider">HIPAA SECURE</span>
          </div>
          BAA Active: AWS/Twilio/Documo. All member data encrypted at rest.
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
