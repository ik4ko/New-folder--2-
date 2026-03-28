"use client"

import * as React from "react"
import { Moon, Sun, Palette, Check } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const colors = [
  { name: "Gold", value: "gold", class: "bg-[#B08627]" },
  { name: "Blue", value: "blue", class: "bg-blue-600" },
  { name: "Green", value: "green", class: "bg-emerald-600" },
  { name: "Purple", value: "purple", class: "bg-purple-600" },
  { name: "Red", value: "red", class: "bg-red-600" },
  { name: "Orange", value: "orange", class: "bg-orange-600" },
]

export function ModeToggle() {
  const { setTheme, theme } = useTheme()
  const [accentColor, setAccentColor] = React.useState<string>("gold")

  React.useEffect(() => {
    const savedColor = localStorage.getItem("medistay-accent-color") || "gold"
    setAccentColor(savedColor)
    document.documentElement.setAttribute("data-theme", savedColor)
  }, [])

  const handleColorChange = (color: string) => {
    setAccentColor(color)
    localStorage.setItem("medistay-accent-color", color)
    document.documentElement.setAttribute("data-theme", color)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/50">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl">
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1.5">
          Appearance
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4" />
            <span className="text-sm font-medium">Light (White)</span>
          </div>
          {theme === "light" && <Check className="w-4 h-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4" />
            <span className="text-sm font-medium">Dark (Black)</span>
          </div>
          {theme === "dark" && <Check className="w-4 h-4 text-primary" />}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="my-2" />
        
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1.5">
          Accent Color
        </DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 p-1">
          {colors.map((color) => (
            <button
              key={color.value}
              onClick={() => handleColorChange(color.value)}
              className={`h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${color.class} ${
                accentColor === color.value ? "ring-2 ring-offset-2 ring-primary ring-offset-background" : "opacity-80"
              }`}
              title={color.name}
            >
              {accentColor === color.value && <Check className="w-4 h-4 text-white" />}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}