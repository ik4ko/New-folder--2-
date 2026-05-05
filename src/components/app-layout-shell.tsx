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
  const { isSidebarOpen, toggleSidebar, isRosterOpen, toggleRoster, updateAgencyProfile } = useAppStore()

  useEffect(() => {
    if (!auth || !db) {
      setIsCheckingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // If we are on a landing or auth page, we don't strictly enforce redirection
      if (isExcluded) {
        setIsCheckingAuth(false)
        return
      }

      if (!user) {
        router.push('/login')
        setIsCheckingAuth(false)
      } else {
        if (user.isAnonymous) {
          updateAgencyProfile({ isTrialInitialized: true });
          setIsCheckingAuth(false);
          return;
        }

        try {
          const agencySnap = await getDoc(doc(db, 'agencies', user.uid));
          if (agencySnap.exists()) {
            const data = agencySnap.data();
            updateAgencyProfile(data as any);
            
            if (!data.isTrialInitialized) {
              router.push('/login');
            }
          } else {
            router.push('/login');
          }
        } catch (e) {
          console.error("Auth check failed:", e);
          // If error occurs, let them stay to prevent loop, but they may hit restricted paths
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

      {!isMobile && <AppSidebar />}
      
      {isMobile && (
        <Sheet open={isSidebarOpen} onOpenChange={toggleSidebar}>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            <SheetTitle className="sr-only">Main Navigation</SheetTitle>
            <AppSidebar />
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
