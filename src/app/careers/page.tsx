
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Briefcase, Globe, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CareersPage() {
  const jobs = [
    { title: "Senior AI Engineer", team: "Engineering", location: "Remote / SF", type: "Full-Time" },
    { title: "Compliance Officer", team: "Legal", location: "Remote", type: "Full-Time" },
    { title: "Product Designer", team: "Product", location: "Remote", type: "Full-Time" },
    { title: "Customer Success Lead", team: "Growth", location: "Remote", type: "Full-Time" },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      <header className="h-20 border-b border-border/50 px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg">M</div>
          <span className="text-xl font-black tracking-tighter uppercase">MediStay</span>
        </Link>
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest">
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
        </Button>
      </header>

      <main className="max-w-4xl mx-auto py-24 px-8 space-y-16">
        <div className="space-y-6 text-center">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Join the Mission</Badge>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">Build the Future of <br /><span className="text-primary">Medicare Retention</span>.</h1>
          <p className="text-xl text-muted-foreground font-bold leading-relaxed uppercase tracking-tight opacity-80 max-w-2xl mx-auto">
            We're looking for individuals who believe that healthcare advice should be human-centric and protected by world-class automation.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job, i) => (
            <div key={i} className="group p-8 rounded-[2.5rem] border border-border bg-card hover:border-primary/30 transition-all flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-tight">{job.title}</h3>
                <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span>{job.team}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>{job.location}</span>
                </div>
              </div>
              <Button className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px]">Apply Now</Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
