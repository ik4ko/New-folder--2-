
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
        {/* Background Cross */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-100 fill-muted/40"
          aria-hidden="true"
        >
          <rect x="35" y="10" width="30" height="80" rx="8" />
          <rect x="10" y="35" width="80" height="30" rx="8" />
        </svg>
        
        {/* Outer Ring */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full fill-none stroke-primary/30 stroke-[2]"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="42" />
        </svg>

        {/* Staff and Serpent */}
        <svg
          viewBox="0 0 100 100"
          className="relative z-10 w-8 h-8"
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
          <rect x="46" y="15" width="8" height="70" rx="4" fill="url(#staffGradient)" />
          
          {/* Serpent */}
          <path
            d="M40 75C40 75 65 70 65 55C65 40 35 45 35 30C35 15 60 15 60 15"
            stroke="url(#serpentGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="60" cy="15" r="4" fill="url(#serpentGradient)" />
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
