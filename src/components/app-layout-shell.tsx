"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "./app-sidebar"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "./ui/button"
import { Menu, Users } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet"
import { CollectionSidebar } from "./collection-sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLandingPage = pathname === "/"
  const isMobile = useIsMobile()
  const { isSidebarOpen, toggleSidebar, isRosterOpen, toggleRoster } = useAppStore()

  if (isLandingPage) {
    return (
      <div className="h-screen w-screen overflow-y-auto bg-background">
        {children}
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background flex-col md:flex-row">
      {/* Mobile Header */}
      {isMobile && (
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-black text-sm">
              M
            </div>
            <span className="text-[10px] font-black uppercase tracking-tight text-foreground">medistay.ai</span>
          </div>
          <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleRoster}>
                <Users className="w-5 h-5 text-muted-foreground" />
             </Button>
             <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleSidebar}>
                <Menu className="w-5 h-5 text-muted-foreground" />
             </Button>
          </div>
        </header>
      )}

      {/* Desktop Navigation Sidebar */}
      {!isMobile && <AppSidebar />}
      
      {/* Mobile Navigation Drawer */}
      {isMobile && (
        <Sheet open={isSidebarOpen} onOpenChange={toggleSidebar}>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            <SheetTitle className="sr-only">Main Navigation</SheetTitle>
            <AppSidebar forceOpen />
          </SheetContent>
        </Sheet>
      )}

      {/* Mobile Roster Drawer */}
      {isMobile && (
        <Sheet open={isRosterOpen} onOpenChange={toggleRoster}>
          <SheetContent side="left" className="p-0 w-72 border-r-0">
            <SheetTitle className="sr-only">Member Roster</SheetTitle>
            <CollectionSidebar forceMobile />
          </SheetContent>
        </Sheet>
      )}
      
      {/* Main Application Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {children}
      </main>
    </div>
  )
}
