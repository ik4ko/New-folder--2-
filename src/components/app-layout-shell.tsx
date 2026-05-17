"use client"

import { usePathname, useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "./ui/button"
import { Menu, Users } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet"
import { CollectionSidebar } from "./collection-sidebar"
import { Logo } from "./logo"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const PROTECTED_PREFIXES = [
  '/dashboard', '/settings', '/vault', '/members',
  '/clients', '/ai', '/accounting', '/check-ins', '/ghl',
]

export function AppShell({ children, sidebar }: { children: React.ReactNode; sidebar?: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const isProtectedRoute = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  const isExcluded = !isProtectedRoute

  const isMobile = useIsMobile()
  const { isSidebarOpen, toggleSidebar, isRosterOpen, toggleRoster, updateAgencyProfile } = useAppStore()

  useEffect(() => {
    if (isExcluded) {
      setIsCheckingAuth(false)
      return
    }

    const supabase = createClient()
    let mounted = true

    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!mounted) return

      if (!user) {
        router.push('/login')
        setIsCheckingAuth(false)
        return
      }

      // Load agency profile for Zustand store
      const { data: agency } = await supabase
        .from('agencies')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (agency && mounted) {
        updateAgencyProfile(agency as any)
      }

      if (mounted) setIsCheckingAuth(false)
    }

    loadUser()

    // Keep session state in sync -- redirect on sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [isExcluded, router, updateAgencyProfile])

  if (isExcluded) {
    return (
      <div className="h-screen w-screen overflow-y-auto bg-background">
        {children}
      </div>
    )
  }

  if (isCheckingAuth) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo iconOnly className="animate-pulse" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Verifying Agency Credentials...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background flex-col md:flex-row">
      {isMobile && (
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0 z-50">
          <Logo iconOnly className="scale-75" />
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

      {!isMobile && sidebar}

      {isMobile && (
        <Sheet open={isSidebarOpen} onOpenChange={toggleSidebar}>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            <SheetTitle className="sr-only">Main Navigation</SheetTitle>
            {sidebar}
          </SheetContent>
        </Sheet>
      )}

      {isMobile && (
        <Sheet open={isRosterOpen} onOpenChange={toggleRoster}>
          <SheetContent side="left" className="p-0 w-72 border-r-0">
            <SheetTitle className="sr-only">Member Roster</SheetTitle>
            <CollectionSidebar forceMobile />
          </SheetContent>
        </Sheet>
      )}

      <main className="flex-1 flex overflow-hidden relative">
        {children}
      </main>
    </div>
  )
}
