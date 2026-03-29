"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "./app-sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLandingPage = pathname === "/"

  if (isLandingPage) {
    return (
      <div className="h-screen w-screen overflow-y-auto bg-background">
        {children}
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Primary Navigation Module Bar */}
      <AppSidebar />
      
      {/* Main Application Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {children}
      </main>
    </div>
  )
}
