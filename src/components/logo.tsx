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
          <rect x="42" y="25" width="16" height="50" rx="4" />
          <rect x="25" y="42" width="50" height="16" rx="4" />
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
          
          {/* Staff (Centered) */}
          <rect x="47" y="15" width="6" height="70" rx="3" fill="url(#staffGradient)" />
          
          {/* Serpent (Coiled around staff) */}
          <path
            d="M35 70C35 70 65 65 65 50C65 35 35 38 35 28C35 18 55 15 55 15"
            stroke="url(#serpentGradient)"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="55" cy="15" r="4" fill="url(#serpentGradient)" />
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
