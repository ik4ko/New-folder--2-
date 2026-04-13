"use client"

import { usePathname, useRouter } from "next/navigation"
import { AppSidebar } from "./app-sidebar"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "./ui/button"
import { Menu, Users } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet"
import { CollectionSidebar } from "./collection-sidebar"
import { Logo } from "./logo"
import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  
  // Routes that shouldn't use the standard app shell
  const isLandingPage = pathname === "/"
  const isDocsPage = pathname.startsWith("/docs")
  const isAuthPage = pathname === "/login" || pathname === "/signup"
  const isExcluded = isLandingPage || isDocsPage || isAuthPage

  const isMobile = useIsMobile()
  const { isSidebarOpen, toggleSidebar, isRosterOpen, toggleRoster, updateAgencyProfile, agencyProfile } = useAppStore()

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // If we are on a landing or auth page, we don't strictly enforce redirection
      // to avoid interfering with the login/signup flow.
      if (isExcluded) {
        setIsCheckingAuth(false)
        return
      }

      if (!user) {
        // Not logged in and trying to access a protected route
        router.push('/login')
        setIsCheckingAuth(false)
      } else {
        // Authenticated users
        if (user.isAnonymous) {
          // Demo mode users skip trial check
          updateAgencyProfile({ isTrialInitialized: true });
          setIsCheckingAuth(false);
          return;
        }

        try {
          const agencySnap = await getDoc(doc(db, 'agencies', user.uid));
          if (agencySnap.exists()) {
            const data = agencySnap.data();
            updateAgencyProfile(data as any);
            
            // If the trial isn't initialized, force them to the login/provisioning flow
            if (!data.isTrialInitialized) {
              router.push('/login');
            }
          } else {
            // Document doesn't exist? Send to login to handle provisioning
            router.push('/login');
          }
        } catch (e) {
          console.error("Auth check failed:", e);
          // On error, we still allow them to stay but maybe they'll hit Firestore errors later
        }
        setIsCheckingAuth(false)
      }
    });

    return () => unsubscribe();
  }, [isExcluded, router, updateAgencyProfile]);

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
      {/* Mobile Header */}
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
