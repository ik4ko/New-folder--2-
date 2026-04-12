
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
        {/* Background Cross - Scaled to fit comfortably inside the circle */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full fill-muted/30"
          aria-hidden="true"
        >
          <rect x="38" y="15" width="24" height="70" rx="6" />
          <rect x="15" y="38" width="70" height="24" rx="6" />
        </svg>
        
        {/* Outer Ring */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full fill-none stroke-primary/20 stroke-[3]"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="44" />
        </svg>

        {/* Staff and Serpent - Re-centered and scaled */}
        <svg
          viewBox="0 0 100 100"
          className="relative z-10 w-7 h-7"
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
          <rect x="47" y="10" width="6" height="80" rx="3" fill="url(#staffGradient)" />
          
          {/* Serpent - Wound tighter around the staff */}
          <path
            d="M35 75C35 75 65 70 65 50C65 30 35 35 35 25C35 15 55 10 55 10"
            stroke="url(#serpentGradient)"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="55" cy="10" r="4" fill="url(#serpentGradient)" />
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
