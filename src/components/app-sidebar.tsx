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
  Link2,
  FileText
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
    <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white shadow-xl z-20">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-slate-100 bg-slate-50/30">
        <div className="flex items-center gap-3 px-4 w-full">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-200">
            M
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900 truncate group-data-[collapsible=icon]:hidden">
            MediStay
          </span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="py-6 bg-white">
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
            <SidebarMenuButton tooltip="SSBCI Fax Agent" className="rounded-xl h-10 px-4 transition-all">
              <Printer className="w-5 h-5" />
              <span className="font-medium">SSBCI Fax Center</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="AI Check-in Calls" className="rounded-xl h-10 px-4 transition-all">
              <PhoneCall className="w-5 h-5" />
              <span className="font-medium">AI Check-ins</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarSeparator className="my-4 mx-2" />
          
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="GHL Sync" className={`rounded-xl h-10 px-4 transition-all ${isGHLConnected ? "text-green-600 bg-green-50" : ""}`}>
              <Link2 className="w-5 h-5" />
              <span className="font-medium">GHL Integration</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Compliance" className="rounded-xl h-10 px-4 transition-all">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-medium">Compliance Vault</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="AI Assistant" className="rounded-xl h-10 px-4 transition-all bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold">Retention AI</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-100 p-4 bg-slate-50/50">
        <div className="group-data-[collapsible=icon]:hidden mb-4">
          <SyncStatus />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings" className="rounded-xl h-9">
              <Settings className="w-4 h-4" />
              <span className="text-xs">Agency Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="rounded-xl h-9 text-red-600 hover:text-red-700 hover:bg-red-50" tooltip="Log out">
              <LogOut className="w-4 h-4" />
              <span className="text-xs">Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <div className="mt-4 p-3 rounded-xl bg-white border border-slate-200 text-[10px] text-slate-500 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 mb-1.5">
            <Lock className="w-3 h-3 text-blue-600" />
            <span className="font-bold text-slate-900 uppercase tracking-widest text-[9px]">HIPAA SECURE</span>
          </div>
          BAA Active: AWS/Twilio/Documo. Records encrypted at rest.
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}