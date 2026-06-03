"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Chrome,
  DatabaseZap,
  Layers3,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UploadCloud,
  Users,
} from "lucide-react"

import { Logo } from "@/components/logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SWITCH_RATE = 0.27
const RECOVERY_RATE = 0.6

const stats = [
  { value: 27, suffix: "%", label: "of MA clients switch plans annually" },
  { value: 1200, prefix: "$", label: "average commission lost per switched client" },
  { value: 60, suffix: "+", label: "days before most switches are discovered" },
]

const steps = [
  {
    title: "Connect your book of business",
    description: "Upload your roster or sync the clients your agency already manages.",
    icon: UploadCloud,
  },
  {
    title: "AegisSage monitors CMS MARx data",
    description: "Automated checks compare plan status, enrollment movement, and risk signals.",
    icon: DatabaseZap,
  },
  {
    title: "Get alerted before the switch finalizes",
    description: "Know which clients need outreach while there is still time to intervene.",
    icon: BellRing,
  },
]

const features = [
  {
    title: "Batch MARx Verification",
    description: "Run high-volume eligibility checks across your whole Medicare book without spreadsheet triage.",
    icon: Layers3,
  },
  {
    title: "Real-time Switch Alerts",
    description: "Surface pending plan changes, disenrollments, and carrier movement before commissions disappear.",
    icon: Activity,
  },
  {
    title: "HIPAA Audit Logging",
    description: "Track PHI access, verification actions, and alert workflows for compliance reviews.",
    icon: ShieldCheck,
  },
  {
    title: "Chrome Extension Automation",
    description: "Reduce manual portal work with guided browser automation for carrier and roster workflows.",
    icon: Chrome,
  },
  {
    title: "Multi-broker Agency Support",
    description: "Give owners and managers a rollup view across downline books, seats, and revenue risk.",
    icon: Users,
  },
  {
    title: "Email Notifications via Resend",
    description: "Route switch alerts to the right broker with clear, action-ready email notifications.",
    icon: Mail,
  },
]

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.18 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return { ref, isInView }
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const { ref, isInView } = useInView<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${
        isInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  start,
}: {
  value: number
  prefix?: string
  suffix?: string
  start: boolean
}) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!start) return

    let frame = 0
    const frames = 42
    const id = window.setInterval(() => {
      frame += 1
      const progress = 1 - Math.pow(1 - frame / frames, 3)
      setCurrent(Math.round(value * Math.min(progress, 1)))
      if (frame >= frames) window.clearInterval(id)
    }, 22)

    return () => window.clearInterval(id)
  }, [start, value])

  return (
    <span>
      {prefix}
      {current.toLocaleString()}
      {suffix}
    </span>
  )
}

function WaitlistDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [form, setForm] = useState({ name: "", email: "", agency_name: "" })
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [error, setError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("sending")
    setError("")

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to join the waitlist.")
      }

      setStatus("sent")
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Unable to join the waitlist.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950 text-white sm:rounded-2xl">
        {status === "sent" ? (
          <div className="space-y-5 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-300" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-black tracking-tight">You're on the list</DialogTitle>
              <DialogDescription className="text-slate-400">
                We will reach out with early access details and onboarding availability for your agency.
              </DialogDescription>
            </div>
            <Button onClick={() => onOpenChange(false)} className="bg-primary font-bold hover:bg-primary/90">
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Request Early Access</DialogTitle>
              <DialogDescription className="text-slate-400">
                Tell us where to send your onboarding details. No PHI required.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Jane Smith"
                  className="border-white/10 bg-white/5 text-white placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input
                  id="email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="jane@agency.com"
                  className="border-white/10 bg-white/5 text-white placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency_name">Agency</Label>
                <Input
                  id="agency_name"
                  required
                  value={form.agency_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, agency_name: event.target.value }))}
                  placeholder="Smith Medicare Group"
                  className="border-white/10 bg-white/5 text-white placeholder:text-slate-600"
                />
              </div>
              {status === "error" && (
                <p className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={status === "sending"}
                className="h-12 w-full bg-primary font-black hover:bg-primary/90"
              >
                {status === "sending" ? "Submitting..." : "Request Early Access"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RoiCalculator() {
  const [clients, setClients] = useState(420)
  const [commission, setCommission] = useState(1200)

  const revenueAtRisk = useMemo(() => clients * commission * SWITCH_RATE, [clients, commission])
  const recoverableRevenue = useMemo(() => revenueAtRisk * RECOVERY_RATE, [revenueAtRisk])

  return (
    <Card className="overflow-hidden border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
      <div className="grid gap-0 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-8 p-6 sm:p-8 lg:p-10">
          <div className="space-y-3">
            <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">ROI Calculator</Badge>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              See the quiet revenue leak in your book.
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Estimate annual commission exposed by Medicare Advantage plan switches, then model how much can be
              recovered when brokers are alerted early enough to act.
            </p>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="clients" className="text-slate-200">Number of clients</Label>
                <span className="font-mono text-sm text-cyan-200">{clients.toLocaleString()}</span>
              </div>
              <input
                id="clients"
                type="range"
                min={50}
                max={2000}
                step={10}
                value={clients}
                onChange={(event) => setClients(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-cyan-300"
              />
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-600">
                <span>50</span>
                <span>2,000</span>
              </div>
            </div>
            <div className="space-y-3">
              <Label htmlFor="commission" className="text-slate-200">Average annual commission per client</Label>
              <div className="flex items-center rounded-lg border border-white/10 bg-white/5 px-3 focus-within:border-primary">
                <span className="text-slate-500">$</span>
                <input
                  id="commission"
                  type="number"
                  min={800}
                  max={2000}
                  step={50}
                  value={commission}
                  onChange={(event) => setCommission(Number(event.target.value))}
                  className="h-11 w-full bg-transparent px-2 text-white outline-none"
                />
              </div>
              <p className="text-xs text-slate-500">Use $800 to $2,000 based on your renewal economics.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-5 border-t border-white/10 bg-white/[0.03] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
          <div className="rounded-lg border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Annual revenue at risk</p>
            <p className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
              {revenueAtRisk.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300/80">
              Estimated recoverable revenue
            </p>
            <p className="mt-3 text-4xl font-black tracking-tight text-emerald-200 sm:text-5xl">
              {recoverableRevenue.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="mt-3 text-sm text-emerald-100/70">Assumes a 60% recovery rate after timely intervention.</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function LandingPage() {
  const [waitlistOpen, setWaitlistOpen] = useState(false)
  const statReveal = useInView<HTMLDivElement>()

  return (
    <div className="min-h-screen scroll-smooth bg-slate-950 text-white selection:bg-cyan-300/20">
      <WaitlistDialog open={waitlistOpen} onOpenChange={setWaitlistOpen} />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/82 px-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4">
          <Link href="/" aria-label="AegisSage home">
            <Logo className="[&_span]:text-white" />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {[
              ["How it works", "#how-it-works"],
              ["Features", "#features"],
              ["ROI", "#roi"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-cyan-200"
              >
                {label}
              </Link>
            ))}
          </nav>
          <Button onClick={() => setWaitlistOpen(true)} className="h-10 bg-primary font-black hover:bg-primary/90">
            Request Early Access
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 py-16 sm:px-6 md:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.13),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0),rgba(2,6,23,1))]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_0.78fr] lg:items-center">
            <Reveal className="space-y-8">
              <Badge className="border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
                Medicare Retention SaaS
              </Badge>
              <div className="space-y-6">
                <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
                  Stop losing Medicare clients silently
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                  AegisSage detects when Medicare Advantage clients switch plans or disenroll, so brokers can
                  intervene before the relationship and commission are gone.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => setWaitlistOpen(true)}
                  size="lg"
                  className="h-14 bg-primary px-7 text-sm font-black hover:bg-primary/90"
                >
                  Request Early Access <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 border-white/15 bg-white/5 px-7 text-sm font-black text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="#roi">Estimate revenue risk</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/40">
                <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
                  <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Live retention desk</p>
                      <p className="mt-1 text-lg font-black text-white">Switch alerts</p>
                    </div>
                    <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">Monitoring</Badge>
                  </div>
                  <div className="space-y-3">
                    {[
                      ["Margaret T.", "Pending plan change", "$1,180 at risk", "Critical"],
                      ["Robert S.", "Disenrollment signal", "$940 at risk", "Review"],
                      ["Linda P.", "Verified unchanged", "$0 at risk", "Clear"],
                    ].map(([name, signal, revenue, status]) => (
                      <div key={name} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                        <div>
                          <p className="font-bold text-white">{name}</p>
                          <p className="text-sm text-slate-500">{signal}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm text-cyan-200">{revenue}</p>
                          <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-500">{status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section ref={statReveal.ref} className="border-y border-white/10 bg-white/[0.03] px-4 py-8 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-white/10 bg-slate-950/60 p-6">
                <p className="text-4xl font-black tracking-tight text-cyan-200">
                  <AnimatedNumber
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    start={statReveal.isInView}
                  />
                </p>
                <p className="mt-2 text-sm font-bold uppercase tracking-widest text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto max-w-7xl space-y-10">
            <Reveal className="max-w-3xl space-y-4">
              <Badge className="border-white/10 bg-white/5 text-slate-300">How it works</Badge>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">A three-step flow built for retention teams.</h2>
            </Reveal>
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <Reveal key={step.title} delay={index * 110}>
                  <Card className="h-full border-white/10 bg-white/[0.04] p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-200">
                        <step.icon className="h-6 w-6" />
                      </div>
                      <span className="font-mono text-sm text-slate-600">0{index + 1}</span>
                    </div>
                    <h3 className="text-xl font-black text-white">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{step.description}</p>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-white/10 bg-slate-900/40 px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto max-w-7xl space-y-10">
            <Reveal className="max-w-3xl space-y-4">
              <Badge className="border-white/10 bg-white/5 text-slate-300">Platform</Badge>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Everything brokers need to catch churn early.</h2>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Reveal key={feature.title} delay={index * 70}>
                  <Card className="h-full border-white/10 bg-slate-950/80 p-6">
                    <feature.icon className="h-7 w-7 text-cyan-200" />
                    <h3 className="mt-5 text-lg font-black text-white">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="roi" className="px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <RoiCalculator />
            </Reveal>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 md:pb-28">
          <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl border border-white/10 bg-cyan-300/10 p-6 sm:p-8 md:flex-row md:items-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Protect the clients you already earned.</h2>
              <p className="max-w-2xl text-slate-300">
                Join the early access list for Medicare agencies that want switch alerts before renewal revenue leaks.
              </p>
            </div>
            <Button onClick={() => setWaitlistOpen(true)} className="h-12 bg-primary px-6 font-black hover:bg-primary/90">
              Request Early Access
            </Button>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
          <div className="space-y-3">
            <Logo className="[&_span]:text-white" />
            <p className="max-w-md text-sm text-slate-500">
              Medicare retention intelligence for brokers who cannot afford silent plan switches.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:gap-5">
            <Link href="/privacy-policy" className="font-bold hover:text-cyan-200">Privacy policy</Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 font-bold text-emerald-200">
              <LockKeyhole className="h-4 w-4" />
              HIPAA-compliant infrastructure
            </div>
            <span className="text-xs">© 2026 AegisSage</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
