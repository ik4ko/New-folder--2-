"use client"

import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  iconOnly?: boolean
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        
        {/* Medical Cross Background */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full fill-muted/30 p-2"
          aria-hidden="true"
        >
          <rect x="40" y="20" width="20" height="60" rx="4" />
          <rect x="20" y="40" width="60" height="20" rx="4" />
        </svg>

        {/* Staff and Serpent */}
        <svg
          viewBox="0 0 100 100"
          className="relative z-10 w-6 h-6"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="staffGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--primary))" />
            </linearGradient>
            <linearGradient id="serpentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--accent))" />
              <stop offset="100%" stopColor="hsl(var(--primary))" />
            </linearGradient>
          </defs>
          
          {/* Staff */}
          <rect x="46" y="10" width="8" height="80" rx="4" fill="url(#staffGradient)" />
          
          {/* Serpent */}
          <path
            d="M30 75C30 75 70 70 70 50C70 30 30 35 30 25C30 15 55 10 55 10"
            stroke="url(#serpentGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="55" cy="10" r="5" fill="url(#serpentGradient)" />
        </svg>
      </div>
      {!iconOnly && (
        <span className="text-xl font-black tracking-tighter uppercase text-foreground">
          MediStay
        </span>
      )}
    </div>
  )
}
