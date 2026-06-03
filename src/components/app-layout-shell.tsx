"use client"

import { usePathname, useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "./ui/button"
import { Menu, Users, PauseCircle } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet"
import { CollectionSidebar } from "./collection-sidebar"
import { Logo } from "./logo"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { SiteNavbar } from "./site-navbar"
import { Skeleton } from "./ui/skeleton"

const PROTECTED_PREFIXES = [
  '/dashboard', '/settings', '/vault', '/members',
  '/clients', '/ai', '/accounting', '/check-ins', '/ghl',
]

// ── Account-paused overlay ────────────────────────────────────────────────────
// Rendered in place of all /dashboard/* content when subscription_status = 'paused'.
// Settings routes remain accessible so the owner can reach /settings/billing.
function AccountPausedOverlay() {
  return (
    <div className="flex-1 flex items-center justify-center bg-background p-8">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center mx-auto">
          <PauseCircle className="w-8 h-8 text-amber-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-black uppercase tracking-widest text-white">
            Account Paused
          </h2>
          <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
            Your subscription is currently paused. All data is fully retained
            but broker access is suspended until billing is resumed.
          </p>
        </div>
        <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 px-5 py-4 text-left space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
            To resume access
          </p>
          <p className="text-[10px] font-medium text-slate-500">
            Contact{' '}
            <a href="mailto:support@aegissage.com" className="text-amber-400 hover:text-amber-300 font-bold">
              support@aegissage.com
            </a>
            {' '}to reactivate your subscription.
          </p>
        </div>
        <Link
          href="/settings/billing"
          className="inline-block text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
        >
          View Billing Settings →
        </Link>
      </div>
    </div>
  )
}

export function AppShell({ children, sidebar }: { children: React.ReactNode; sidebar?: React.ReactNode }) {
  const pathname  = usePathname() ?? ''
  const router    = useRouter()
  const [isCheckingAuth,  setIsCheckingAuth]  = useState(true)
  // null = not yet resolved; string = resolved status
  const [accountStatus, setAccountStatus] = useState<string | null>(null)

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

      // ── Owner path: full agency row for Zustand store ─────────────────────
      // maybeSingle() is safe for non-owners (returns null, no error).
      const { data: agency } = await supabase
        .from('agencies')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      let resolvedStatus: string | null = agency?.subscription_status ?? null

      if (agency && mounted) {
        updateAgencyProfile(agency as Parameters<typeof updateAgencyProfile>[0])
      }

      // ── Broker path: resolve parent agency status for non-owners ──────────
      // Sub-brokers don't own an agency row. We look up their broker record
      // to find their parent agency, then check that agency's status.
      // This ensures deleted/paused states block broker sessions too.
      if (!agency) {
        const { data: brokerRow } = await supabase
          .from('brokers')
          .select('agency_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (brokerRow?.agency_id) {
          const { data: parentAgency } = await supabase
            .from('agencies')
            .select('subscription_status')
            .eq('id', brokerRow.agency_id)
            .maybeSingle()
          resolvedStatus = parentAgency?.subscription_status ?? null
        }
      }

      if (!mounted) return

      // ── Lifecycle gate ────────────────────────────────────────────────────
      // deleted → redirect to /account-deleted (sign-out happens on that page)
      if (resolvedStatus === 'deleted') {
        router.replace('/account-deleted')
        return
      }

      setAccountStatus(resolvedStatus)
      setIsCheckingAuth(false)
    }

    loadUser()

    // Keep session state in sync — redirect on sign-out
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
      <div className="h-screen w-screen overflow-y-auto bg-background antialiased">
        {pathname !== '/' && <SiteNavbar />}
        {children}
      </div>
    )
  }

  if (isCheckingAuth) {
    return (
      <div className="h-screen w-screen bg-background p-6 antialiased">
        <div className="mx-auto flex h-full max-w-6xl flex-col justify-center gap-8">
          <div className="flex items-center gap-3">
            <Logo iconOnly />
            <div className="space-y-2">
              <Skeleton className="h-3 w-44 bg-white/10" />
              <Skeleton className="h-2 w-28 bg-white/5" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32 rounded-xl bg-white/10" />
            <Skeleton className="h-32 rounded-xl bg-white/10" />
            <Skeleton className="h-32 rounded-xl bg-white/10" />
          </div>
          <Skeleton className="h-72 rounded-xl bg-white/5" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background antialiased flex-col md:flex-row">
      {isMobile && (
        <header className="h-14 border-b border-white/[0.07] bg-[hsl(var(--sidebar-background))] flex items-center justify-between px-4 shrink-0 z-50">
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
        {/* Paused overlay — covers /dashboard/* only; /settings/* stays accessible */}
        {accountStatus === 'paused' && pathname.startsWith('/dashboard') ? (
          <AccountPausedOverlay />
        ) : (
          children
        )}
      </main>
    </div>
  )
}
