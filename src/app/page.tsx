"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Activity, Printer, ShieldPlus } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { useTranslation } from "@/lib/i18n"
import { LanguageSelector } from "@/components/language-selector"
import { ComplianceShield } from "@/components/ComplianceShield"

const FEATURES = [
  {
    title: '48-Hour Roster Monitoring',
    desc: 'AegisSage compares your carrier roster against your book of business every 48 hours and fires an alert the moment a client disappears from your roster — before you lose the commission.',
    icon: Activity,
    demo: 'Switch alert fired — Margaret Thompson missing from Humana roster.',
  },
  {
    title: 'VCC Form Automation',
    desc: 'Submit CMS Vendor-Contractor-Certification chronic illness forms directly to your clients\' doctors by fax. VCC approval locks in the plan benefit tier and protects your renewal stream.',
    icon: Printer,
    demo: 'VCC faxed to Dr. Patricia Smith — Humana Gold Plus H5619.',
  },
  {
    title: 'Client Relationship Protection',
    desc: 'AegisSage includes advanced compliance tools that legally secure your broker-client relationships with carriers — keeping your book protected from competitor interference.',
    icon: ShieldPlus,
    demo: 'Protection confirmed — Robert Sanchez secured to your book.',
  },
]

export default function LandingPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/10 scroll-smooth overflow-y-auto">
      {/* Navigation */}
      <header className="h-16 md:h-20 border-b border-border/50 px-4 md:px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-10">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Features</Link>
            <Link href="#pricing" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector variant="ghost" className="hidden sm:flex" />
          <Button variant="ghost" asChild className="text-xs font-black uppercase tracking-widest">
            <Link href="/login">{t('common.login')}</Link>
          </Button>
          <Button asChild className="rounded-xl h-11 px-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-xs">
            <Link href="/signup">{t('common.signup')}</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section id="hero" className="relative py-12 md:py-32 px-4 md:px-8">
          <div className="max-w-7xl mx-auto bg-slate-950 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-32 text-center space-y-8 border border-white/5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]">
            <h1 className="text-4xl sm:text-6xl md:text-9xl font-black tracking-tighter leading-[0.9] md:leading-[0.85] text-white">
              Protect Your Book.<br />Retain Every Client.
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-slate-300 font-medium leading-relaxed max-w-3xl mx-auto mb-8">
              Your clients trust you with their coverage. We make sure nothing gets in the way of that.
            </p>
            <div className="flex justify-center">
              <Button size="lg" asChild className="w-full sm:w-auto h-14 md:h-20 px-8 md:px-16 rounded-[2rem] md:rounded-[2.5rem] text-base md:text-xl font-black shadow-2xl shadow-primary/30 transition-all hover:scale-105 bg-primary hover:bg-primary/90 text-white">
                <Link href="/signup">Start Free Trial</Link>
              </Button>
            </div>
          </div>
        </section>

        <ComplianceShield />

        {/* Features Section */}
        <section id="features" className="py-32 px-8 max-w-7xl mx-auto space-y-24">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-5xl font-black uppercase tracking-tighter">Retention <span className="text-primary">Intelligence</span></h2>
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Three core modules designed to protect your agency&apos;s renewal revenue.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, i) => (
              <Card key={i} className="p-10 rounded-[3rem] border border-border space-y-8 hover:border-primary/30 transition-all group bg-card shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                  <feature.icon className="w-8 h-8" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black uppercase tracking-tight text-black">{feature.title}</h3>
                  <p className="text-sm font-bold text-muted-foreground uppercase leading-relaxed opacity-70">
                    {feature.desc}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-[10px] text-primary/70 font-black uppercase tracking-tighter">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Signal
                  </div>
                  {feature.demo}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-32 px-8 bg-slate-50 border-y border-border/50">
          <div className="max-w-4xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <Badge className="bg-slate-800 text-white border border-slate-600 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Simple Pricing</Badge>
              <h2 className="text-5xl font-black uppercase tracking-tighter" style={{ color: '#111827' }}>Two Plans. <span className="text-primary">Zero Surprises.</span></h2>
              <p className="text-slate-600 font-black uppercase tracking-widest text-xs" style={{ color: '#374151' }}>No hidden fees. Start your free trial today.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Broker Plan */}
              <Card className="rounded-[3.5rem] border border-border p-10 flex flex-col justify-between transition-all bg-white shadow-sm hover:border-primary/30">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-black mb-2">Broker</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-6xl font-black tracking-tighter text-black">$79</span>
                    <span className="text-sm font-bold text-black uppercase opacity-60">/mo</span>
                  </div>
                  <div className="space-y-4 mb-10">
                    {[
                      '1 broker seat',
                      'My Book view',
                      'VCC Forms',
                      'Churn alerts',
                      'GHL connect',
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-4 text-xs font-black text-black uppercase tracking-tight">
                        <CheckCircle2 size={16} className="text-primary shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button asChild className="w-full h-16 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl bg-slate-900 text-white hover:bg-primary transition-all">
                  <Link href="/signup?plan=broker">Start Free Trial</Link>
                </Button>
              </Card>

              {/* Agency/Owner Plan */}
              <Card className="rounded-[3.5rem] border-0 ring-2 ring-primary p-10 flex flex-col justify-between transition-all bg-white shadow-2xl scale-[1.02]">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-black">Agency / Owner</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-6xl font-black tracking-tighter text-black">$497</span>
                    <span className="text-sm font-bold text-black uppercase opacity-60">/mo</span>
                  </div>
                  <div className="space-y-4 mb-10">
                    {[
                      '1 owner + 3 managers',
                      'Full agency view',
                      'Master roster import',
                      'Revenue-at-risk view',
                      'Compliance vault',
                      'Broker performance',
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-4 text-xs font-black text-black uppercase tracking-tight">
                        <CheckCircle2 size={16} className="text-primary shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button asChild className="w-full h-16 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl bg-primary text-white hover:bg-primary/90 transition-all">
                  <Link href="/signup?plan=agency">Start Free Trial</Link>
                </Button>
              </Card>
            </div>
          </div>
        </section>
        {/* Contact Section */}
        <section id="contact" className="py-32 px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-5xl font-black uppercase tracking-tighter text-black">
                  Ready to <span className="text-primary">protect</span> your book?
                </h2>
                <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">
                  Start your free trial today. No credit card required.
                </p>
              </div>
              <Button asChild size="lg"
                className="h-16 px-12 rounded-3xl font-black uppercase text-sm tracking-widest shadow-xl bg-primary text-white hover:bg-primary/90 transition-all hover:scale-105">
                <Link href="/signup">Start Free Trial</Link>
              </Button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight text-black">Get in Touch</h3>
                <p className="text-muted-foreground font-bold text-sm">
                  Questions before you sign up? We&apos;d love to hear from you.
                </p>
              </div>
              <a
                href="mailto:hello@aegissage.com"
                className="inline-block text-xl font-black text-primary hover:text-primary/80 transition-colors"
              >
                hello@aegissage.com
              </a>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                We typically respond within one business day.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-32 px-8 border-t border-border/50 text-center">
        <div className="flex items-center justify-center gap-3 mb-10">
          <Logo />
        </div>
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-4">&copy; 2026 AegisSage Intelligence Inc. HIPAA Compliant.</p>
        <p className="text-slate-500 text-[10px] font-bold leading-relaxed max-w-2xl mx-auto mb-10">
          Notice: For licensed Medicare agents who are the Agent of Record only. AegisSage is not affiliated with CMS or any government agency.
        </p>
        <div className="flex flex-wrap justify-center gap-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link href="/baa" className="hover:text-primary transition-colors">BAA Agreement</Link>
        </div>
      </footer>
    </div>
  )
}
