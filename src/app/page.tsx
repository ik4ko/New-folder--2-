"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  CheckCircle2, Activity, Printer, ShieldPlus, Building2, Zap,
  Shield, Lock, Users, BarChart3, ArrowRight, X, Send,
} from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { useTranslation } from "@/lib/i18n"
import { LanguageSelector } from "@/components/language-selector"
import { ComplianceShield } from "@/components/ComplianceShield"

// ── Enterprise Onboarding Modal ───────────────────────────────────────────────
function EnterpriseModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', agency: '', email: '', phone: '', size: '', note: '' })
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    await new Promise(r => setTimeout(r, 900))
    setSending(false)
    setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}>
      <div className="relative w-full max-w-lg bg-slate-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-primary/30 to-violet-600/20 border-b border-white/10 px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/80">Agency &amp; Enterprise</p>
            <p className="text-lg font-black text-white tracking-tight">Request Onboarding &amp; Security Docs</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-8 py-6">
          {submitted ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-xl font-black text-white tracking-tight">Request Received</p>
              <p className="text-sm text-white/50 font-medium">Our enterprise team will contact you within one business day with a security packet, BAA template, and custom onboarding schedule.</p>
              <Button onClick={onClose} variant="outline" className="mt-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-white/20 text-white hover:bg-white/10">Close</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Your Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 placeholder:text-white/20 focus:outline-none focus:border-primary"
                    placeholder="Jane Smith" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Agency Name *</label>
                  <input required value={form.agency} onChange={e => setForm(f => ({ ...f, agency: e.target.value }))}
                    className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 placeholder:text-white/20 focus:outline-none focus:border-primary"
                    placeholder="Smith Medicare Group" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Work Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 placeholder:text-white/20 focus:outline-none focus:border-primary"
                    placeholder="jane@youragency.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 placeholder:text-white/20 focus:outline-none focus:border-primary"
                    placeholder="(555) 000-0000" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Number of Brokers</label>
                <select value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                  className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 focus:outline-none focus:border-primary">
                  <option value="" className="bg-slate-900">Select range</option>
                  <option value="1-5" className="bg-slate-900">1-5 brokers</option>
                  <option value="6-15" className="bg-slate-900">6-15 brokers</option>
                  <option value="16-50" className="bg-slate-900">16-50 brokers</option>
                  <option value="50+" className="bg-slate-900">50+ brokers</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Anything specific? (Optional)</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2}
                  className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 py-2.5 placeholder:text-white/20 focus:outline-none focus:border-primary resize-none"
                  placeholder="BAA, custom onboarding, data migration, SSO..." />
              </div>
              <div className="flex items-center gap-4 pt-1">
                {["SOC 2 Ready", "BAA Included", "HIPAA Compliant"].map(t => (
                  <div key={t} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white/30">
                    <Shield className="w-2.5 h-2.5" />{t}
                  </div>
                ))}
              </div>
              <Button type="submit" disabled={sending}
                className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 gap-2">
                {sending ? "Sending..." : <><Send className="w-3.5 h-3.5 mr-1" />Send Request</>}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Marketing Pillars ─────────────────────────────────────────────────────────
const FEATURES = [
  {
    title: "Automated Carrier Verification Engine",
    desc: "Our Chrome Extension syncs client Name, current Plan, and Coverage in the background — silently checking each member against carrier rosters. Catches plan switches automatically without manual portal lookups or spreadsheet audits.",
    icon: Activity,
    demo: "Background sync complete — plan switch detected · Robert Sanchez · Humana → United.",
    tier: "both",
  },
  {
    title: "VCC Form Automation",
    desc: "Submit CMS Vendor-Contractor-Certification chronic illness forms directly to physician offices via automated faxing on behalf of your client. VCC approval locks the benefit tier and protects your renewal stream — no manual steps required.",
    icon: Printer,
    demo: "VCC faxed to Dr. Patricia Smith — Humana Gold Plus H5619.",
    tier: "both",
  },
  {
    title: "Automated Retention Campaigns",
    desc: "The moment a coverage anomaly is detected, AegisSage fires multi-channel outreach — text alerts to the client, email notifications to you, and a templated re-enrollment workflow so no switch slips through uncontested.",
    icon: ShieldPlus,
    demo: "Retention campaign fired — 3 text alerts sent · Linda Park · switch risk HIGH.",
    tier: "both",
  },
]

const BROKER_FEATURES = [
  "Personal book-of-business protection",
  "Plan & Coverage lookup · Chrome Extension sync",
  "48-hour roster change monitoring",
  "VCC fax automation to physicians",
  "Churn & switch alerts",
  "GoHighLevel CRM integration",
  "AEP Shield campaign tools",
  "AI retention scripts",
]

const AGENCY_FEATURES = [
  "Everything in Independent Broker",
  "Manager Control Center dashboard",
  "Downline roster tracking (all brokers)",
  "Agency-wide override leak alerts",
  "Volume license management",
  "Role-based permissions (Owner / Manager / CS)",
  "Revenue-at-risk monitoring",
  "Master roster import & VCC on behalf of brokers",
  "Priority enterprise support",
  "BAA execution on request",
]

// ── Per-card billing toggle ───────────────────────────────────────────────────
function BillingToggle({
  annual,
  onToggle,
}: {
  annual: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-3 mb-5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
      <span className={"text-[10px] font-black uppercase tracking-widest " + (!annual ? "text-slate-900" : "text-slate-400")}>
        Monthly
      </span>
      <button
        onClick={onToggle}
        aria-label="Toggle billing period"
        className={"relative w-12 h-6 rounded-full transition-colors " + (annual ? "bg-primary" : "bg-slate-300")}
      >
        <span className={"absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform " + (annual ? "translate-x-7" : "translate-x-1")} />
      </button>
      <span className={"text-[10px] font-black uppercase tracking-widest " + (annual ? "text-slate-900" : "text-slate-400")}>
        Annual <span className="text-primary">— Save 20%</span>
      </span>
    </div>
  )
}

export default function LandingPage() {
  const { t } = useTranslation()
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false)
  const [brokerAnnual, setBrokerAnnual] = useState(false)
  const [agencyAnnual, setAgencyAnnual] = useState(false)

  const brokerPrice = brokerAnnual ? 119 : 149
  const agencyPrice = agencyAnnual ? 599 : 749

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/10 scroll-smooth overflow-y-auto">
      {showEnterpriseModal && <EnterpriseModal onClose={() => setShowEnterpriseModal(false)} />}

      {/* Navigation */}
      <header className="h-16 md:h-20 border-b border-border/50 px-4 md:px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-10">
          <Link href="/"><Logo /></Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Features</Link>
            <Link href="#tiers" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Who It's For</Link>
            <Link href="#pricing" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector variant="ghost" className="hidden sm:flex" />
          <Button variant="ghost" asChild className="text-xs font-black uppercase tracking-widest">
            <Link href="/login">{t("common.login")}</Link>
          </Button>
          <Button asChild className="rounded-xl h-11 px-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-xs">
            <Link href="/signup">{t("common.signup")}</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">

        {/* Hero */}
        <section id="hero" className="relative py-12 md:py-32 px-4 md:px-8">
          <div className="max-w-7xl mx-auto bg-slate-950 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-32 text-center space-y-8 border border-white/5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]">
            <Badge className="bg-primary/10 text-primary border border-primary/20 font-black uppercase tracking-[0.25em] text-[9px] px-4 py-1.5">
              Medicare Retention Intelligence
            </Badge>
            <h1 className="text-4xl sm:text-6xl md:text-9xl font-black tracking-tighter leading-[0.9] md:leading-[0.85] text-white">
              Stop Guessing Your Retention.<br />Real-Time Plan Verification,<br />Driven Automatically by Your CRM.
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-slate-300 font-medium leading-relaxed max-w-3xl mx-auto">
              The only Medicare retention platform built for independent brokers and agency owners who refuse to lose a client to a plan switch they didn't see coming.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="w-full sm:w-auto h-14 md:h-20 px-8 md:px-16 rounded-[2rem] md:rounded-[2.5rem] text-base md:text-xl font-black shadow-2xl shadow-primary/30 transition-all hover:scale-105 bg-primary hover:bg-primary/90 text-white">
                <Link href="/signup">Get Started Now</Link>
              </Button>
              <Button size="lg" variant="ghost" onClick={() => setShowEnterpriseModal(true)}
                className="w-full sm:w-auto h-14 md:h-20 px-8 md:px-16 rounded-[2rem] md:rounded-[2.5rem] text-base md:text-xl font-black text-white/60 hover:text-white hover:bg-white/5 border border-white/10 transition-all">
                Agency Inquiry <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        <ComplianceShield />

        {/* Two-Tier Experience */}
        <section id="tiers" className="py-20 md:py-32 px-4 md:px-8">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Two Platforms. <span className="text-primary">One Mission.</span></h2>
              <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">AegisSage delivers a completely distinct experience based on your role.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Broker Tier */}
              <div className="rounded-[2.5rem] border-0 ring-2 ring-slate-700 bg-slate-950 overflow-hidden shadow-2xl shadow-slate-900/50">
                <div className="h-1.5 bg-gradient-to-r from-slate-500 to-slate-400 w-full" />
                <div className="p-10 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow-lg">
                      <Zap className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Independent Broker</p>
                      <p className="text-2xl font-black tracking-tight text-white">Personal Speed &amp; Control</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-white/60 leading-relaxed">Your personal command center. Plan & Coverage lookups, Chrome Extension sync, roster monitoring, and switch alerts — faster than any competitor.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ label: "Coverage Lookup", sub: "Chrome Extension sync" }, { label: "48-hr Monitoring", sub: "Roster change alerts" }, { label: "VCC Automation", sub: "Fax to physician" }, { label: "AEP Shield", sub: "Enrollment protection" }].map(({ label, sub }) => (
                      <div key={label} className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/80">{label}</p>
                        <p className="text-[9px] font-medium text-white/30 uppercase tracking-wide">{sub}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 font-mono text-[10px] space-y-2">
                    <div className="flex items-center justify-between text-white/30 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest">My Book — Live</span>
                      </div>
                    </div>
                    {[{ name: "Margaret Thompson", status: "🔴 Switched" }, { name: "Robert Sanchez", status: "✓ Verified" }, { name: "Linda Park", status: "🚨 Switching Soon" }].map(row => (
                      <div key={row.name} className="flex items-center justify-between text-[9px]">
                        <span className="text-white/60 font-bold">{row.name}</span>
                        <span className="text-white/40">{row.status}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/90 text-white transition-all">
                    <Link href="/signup?plan=broker">Get Started Now</Link>
                  </Button>
                </div>
              </div>

              {/* Agency Owner Tier */}
              <div className="rounded-[2.5rem] border-0 ring-2 ring-primary bg-slate-950 overflow-hidden shadow-2xl shadow-primary/10">
                <div className="h-1.5 bg-gradient-to-r from-primary via-violet-500 to-primary w-full" />
                <div className="p-10 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <Building2 className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Agency Owner</p>
                      <p className="text-2xl font-black tracking-tight text-white">Manager Control Center</p>
                    </div>
                    <Badge className="ml-auto bg-primary/10 text-primary border border-primary/30 font-black uppercase text-[9px] tracking-widest px-3">Enterprise</Badge>
                  </div>
                  <p className="text-sm font-medium text-white/60 leading-relaxed">A completely separate command layer above your brokers. Monitor every downline book simultaneously, surface agency-wide override leaks, manage volume licenses, and control role permissions.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ label: "Downline Tracking", sub: "All broker books" }, { label: "Override Leak Alerts", sub: "Agency-wide view" }, { label: "Volume Licensing", sub: "Per-broker seat mgmt" }, { label: "Role Permissions", sub: "Owner / Manager / CS" }].map(({ label, sub }) => (
                      <div key={label} className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/80">{label}</p>
                        <p className="text-[9px] font-medium text-white/30 uppercase tracking-wide">{sub}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 font-mono text-[10px] space-y-2">
                    <div className="flex items-center justify-between text-white/30 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Agency Dashboard — Live</span>
                      </div>
                      <span className="text-[9px] text-primary/70">12 brokers · 847 members</span>
                    </div>
                    {[{ broker: "J. Williams", alerts: "3 critical", rev: "$2,340 at risk" }, { broker: "M. Rodriguez", alerts: "1 switch", rev: "$780 at risk" }, { broker: "S. Chen", alerts: "✓ Clear", rev: "$0 at risk" }].map(row => (
                      <div key={row.broker} className="flex items-center justify-between text-[9px]">
                        <span className="text-white/60 font-bold">{row.broker}</span>
                        <span className="text-orange-400">{row.alerts}</span>
                        <span className="text-white/30">{row.rev}</span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => setShowEnterpriseModal(true)}
                    className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/30 gap-2">
                    <Send className="w-3.5 h-3.5" />Request Onboarding
                  </Button>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 text-center">Starting at $749/mo · BAA included</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 md:py-32 px-4 md:px-8 max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Retention <span className="text-primary">Intelligence</span></h2>
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Three core modules designed to protect your agency's renewal revenue.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, i) => (
              <Card key={i} className="p-10 rounded-[3rem] border border-border space-y-8 hover:border-primary/30 transition-all group bg-card shadow-sm relative overflow-hidden">
                {feature.tier === "agency" && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary/10 text-primary border border-primary/20 font-black uppercase text-[8px] tracking-widest px-2 py-0.5">Agency</Badge>
                  </div>
                )}
                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <feature.icon className="w-8 h-8" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black uppercase tracking-tight text-black">{feature.title}</h3>
                  <p className="text-sm font-bold text-muted-foreground uppercase leading-relaxed opacity-70">{feature.desc}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-[10px] font-black uppercase tracking-tighter" style={{ color: '#1A1A1A' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live Signal
                  </div>
                  {feature.demo}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 md:py-32 px-4 md:px-8 bg-slate-50 border-y border-border/50">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-6">
              <Badge className="bg-slate-800 text-white border border-slate-600 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Transparent Pricing</Badge>
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter" style={{ color: "#111827" }}>Two Tiers. <span className="text-primary">Zero Hidden Fees.</span></h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Solo Plan */}
              <Card className="rounded-[3.5rem] border border-border p-10 flex flex-col justify-between bg-white shadow-sm hover:border-primary/30 transition-all">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: '#1A1A1A' }}>Independent Broker</p>
                      <p className="text-xl font-black text-slate-900">Solo Plan</p>
                    </div>
                  </div>
                  <BillingToggle annual={brokerAnnual} onToggle={() => setBrokerAnnual(b => !b)} />
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-6xl font-black tracking-tighter text-black">${brokerPrice}</span>
                    <span className="text-sm font-bold text-black uppercase opacity-60">/mo</span>
                  </div>
                  {brokerAnnual && <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Billed annually · Save $360/yr</p>}
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-8">One broker seat</p>
                  <div className="space-y-3 mb-10">
                    {BROKER_FEATURES.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs font-black text-black uppercase tracking-tight">
                        <CheckCircle2 size={15} className="text-primary shrink-0" /><span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button asChild className="w-full h-16 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl bg-slate-900 text-white hover:bg-primary transition-all">
                  <Link href="/signup?plan=broker">Get Started Now</Link>
                </Button>
              </Card>

              {/* Agency Plan */}
              <Card className="rounded-[3.5rem] border-0 ring-2 ring-primary p-10 flex flex-col justify-between bg-white shadow-2xl scale-[1.02] relative overflow-hidden">
                <div className="absolute top-5 right-5"><Badge className="bg-primary text-white font-black uppercase text-[9px] tracking-widest px-3 py-1">Enterprise</Badge></div>
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: '#1A1A1A' }}>Agency Owner</p>
                      <p className="text-xl font-black text-slate-900">Agency Plan</p>
                    </div>
                  </div>
                  <BillingToggle annual={agencyAnnual} onToggle={() => setAgencyAnnual(b => !b)} />
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-6xl font-black tracking-tighter text-black">${agencyPrice}</span>
                    <span className="text-sm font-bold text-black uppercase opacity-60">/mo base</span>
                  </div>
                  {agencyAnnual && <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Billed annually · Save $1,800/yr</p>}
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-8">+$49/broker seat/mo</p>
                  <div className="space-y-3 mb-10">
                    {AGENCY_FEATURES.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs font-black text-black uppercase tracking-tight">
                        <CheckCircle2 size={15} className="text-primary shrink-0" /><span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={() => setShowEnterpriseModal(true)}
                  className="w-full h-16 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl bg-primary text-white hover:bg-primary/90 transition-all gap-2">
                  <Send className="w-4 h-4" />Request Onboarding
                </Button>
              </Card>
            </div>

          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="py-20 md:py-32 px-4 md:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black">Ready to <span className="text-primary">protect</span> your book?</h2>
                <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">Individual brokers get started instantly. Agencies request an onboarding call.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="h-16 px-10 rounded-3xl font-black uppercase text-sm tracking-widest shadow-xl bg-primary text-white hover:bg-primary/90 transition-all hover:scale-105">
                  <Link href="/signup">Get Started Now</Link>
                </Button>
                <Button size="lg" variant="outline" onClick={() => setShowEnterpriseModal(true)}
                  className="h-16 px-10 rounded-3xl font-black uppercase text-[10px] tracking-widest border-slate-300 hover:border-primary hover:text-primary transition-all">
                  Agency Inquiry
                </Button>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight text-black">Get in Touch</h3>
                <p className="text-muted-foreground font-bold text-sm">Questions before you sign up? We'd love to hear from you.</p>
              </div>
              <a href="mailto:hello@aegissage.com" className="inline-block text-xl font-black text-primary hover:text-primary/80 transition-colors">hello@aegissage.com</a>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">We typically respond within one business day.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-16 md:py-24 px-4 md:px-8 border-t border-border/50 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-16">
            <div className="md:col-span-2 space-y-4">
              <Link href="/"><Logo /></Link>
              <p className="text-slate-400 text-sm font-bold leading-relaxed max-w-sm">The Medicare retention intelligence platform for licensed independent agents and agency owners.</p>
              <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-sm">AegisSage is not affiliated with CMS or any federal government agency. For licensed agents who are the Agent of Record only.</p>
            </div>
            <div className="space-y-4">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Platform</p>
              <div className="space-y-3">
                {[{ label: "Independent Broker", href: "/signup?plan=broker" }, { label: "Agency Enterprise", href: "#pricing" }, { label: "Pricing", href: "#pricing" }, { label: "Sign In", href: "/login" }].map(({ label, href }) => (
                  <Link key={label} href={href} className="block text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">{label}</Link>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Legal &amp; Compliance</p>
              <div className="space-y-3">
                {[{ label: "Privacy Policy", href: "/privacy-policy" }, { label: "Terms of Service", href: "/terms-of-service" }, { label: "Security & Compliance", href: "/security-compliance" }, { label: "BAA Agreement", href: "/baa" }].map(({ label, href }) => (
                  <Link key={label} href={href} className="block text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">{label}</Link>
                ))}
              </div>
            </div>
          </div>
          {/* Trust badge grid — absolute bottom of page */}
          <div className="border-t border-white/5 pt-8 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Shield,       title: "HIPAA Compliant",  sub: "PHI handled under BAA" },
                { icon: Lock,         title: "AES-256 Encrypted", sub: "Data at rest + in transit" },
                { icon: CheckCircle2, title: "BAA Included",      sub: "Required for all agencies" },
                { icon: BarChart3,    title: "SOC 2 Aligned",     sub: "Audit-ready infrastructure" },
              ].map(({ icon: Icon, title, sub }) => (
                <div key={title} className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white">{title}</p>
                    <p className="text-[9px] font-medium text-slate-400 mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">&copy; 2026 AegisSage Intelligence Inc. All rights reserved.</p>
              <p className="text-slate-700 text-[9px] font-bold uppercase tracking-widest">Not affiliated with CMS · For licensed Agents of Record only</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
