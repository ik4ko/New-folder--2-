
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ShieldCheck, Zap, Activity, Users, 
  ArrowRight, CheckCircle2, Globe, Lock, 
  Sparkles, Calendar, Scale, FileText, Eye
} from "lucide-react"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'branding-header')

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TooltipProvider delayDuration={0}>
        {/* Nav */}
        <header className="h-20 border-b border-border/50 px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20 cursor-default">
                  M
                </div>
              </TooltipTrigger>
              <TooltipContent>MediStay Intelligence Inc.</TooltipContent>
            </Tooltip>
            <span className="text-xl font-black tracking-tighter uppercase">MediStay</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">Features</Link>
            <Link href="#pricing" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">Pricing</Link>
            <Link href="#compliance" className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">Compliance</Link>
          </nav>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <Button variant="outline" className="hidden sm:flex rounded-xl h-11 px-6 border-2 font-black uppercase tracking-widest text-[10px]" asChild>
              <Link href="/dashboard">Log In</Link>
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="relative py-24 md:py-32 px-8 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full -z-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse delay-700" />
          </div>

          <div className="max-w-5xl mx-auto text-center space-y-8">
            <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 h-auto gap-2 font-black uppercase tracking-widest text-[10px] rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Autonomous Medicare Retention is Here
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9]">
              Shield Your <span className="text-primary">Book of Business</span> From Competitors.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-bold max-w-2xl mx-auto uppercase tracking-tight opacity-80">
              Real-time CMS switch detection, automated SSBCI faxes via Spruce Health, and AI-driven member check-ins. Built for enterprise Medicare agencies.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="w-full sm:w-auto h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-2xl shadow-primary/30 text-xs gap-3" asChild>
                <Link href="/dashboard">
                  Start 14-Day Free Trial <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-16 px-10 rounded-2xl border-2 border-border font-black uppercase tracking-widest text-xs" asChild>
                <Link href="#features">See How it Works</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 px-8">
          <div className="max-w-6xl mx-auto space-y-20">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black uppercase tracking-tighter">The Retention <span className="text-accent">OS</span></h2>
              <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Four modules of absolute member protection.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Link href="/docs/cms-switch" className="p-10 rounded-[2.5rem] bg-card border border-border space-y-6 hover:border-primary/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Activity className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Module 1: CMS Switch Detection</h3>
                <p className="text-sm font-bold text-muted-foreground uppercase leading-relaxed opacity-70">
                  Instantly detect when a member switches carriers via nightly MARx snapshot polls. Catch churn before the disenrollment window closes.
                </p>
              </Link>

              <Link href="/docs/maya-voice" className="p-10 rounded-[2.5rem] bg-card border border-border space-y-6 hover:border-accent/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Module 2: Maya AI Check-ins</h3>
                <p className="text-sm font-bold text-muted-foreground uppercase leading-relaxed opacity-70">
                  Autonomous voice check-ins at critical policy milestones. Maya identifies dissatisfaction and escalates high-risk cases to brokers in real-time.
                </p>
              </Link>

              <Link href="/docs/spruce-fax" className="p-10 rounded-[2.5rem] bg-card border border-border space-y-6 hover:border-primary/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Module 3: Spruce Health Fax Agent</h3>
                <p className="text-sm font-bold text-muted-foreground uppercase leading-relaxed opacity-70">
                  Automated chronic condition verification. MediStay faxes PCP offices directly via Spruce Health to activate specialized benefits, locking in member loyalty.
                </p>
              </Link>

              <Link href="/docs/ghl-sync" className="p-10 rounded-[2.5rem] bg-card border border-border space-y-6 hover:border-accent/30 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                  <Globe className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Module 4: GHL Data Sync</h3>
                <p className="text-sm font-bold text-muted-foreground uppercase leading-relaxed opacity-70">
                  Two-way sync with GoHighLevel. Map Medicare fields directly to your CRM and trigger workflows automatically based on retention logic.
                </p>
              </Link>
            </div>
          </div>
        </section>

        {/* Compliance Guarantee Section */}
        <section id="compliance" className="py-24 px-8 bg-slate-950 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-20 opacity-5 -z-0">
            <ShieldCheck className="w-96 h-96" />
          </div>
          
          <div className="max-w-6xl mx-auto space-y-16 relative z-10">
            <div className="text-center space-y-4">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Clinical Integrity</Badge>
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-tight">The Clinical <span className="text-primary">Compliance Guarantee</span>.</h2>
              <p className="text-lg text-slate-400 font-bold uppercase tracking-tight max-w-3xl mx-auto">
                MediStay was built from the ground up to exceed the security requirements of the Medicare market. We don't just store data; we seal it.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Privacy Summary */}
              <div className="p-10 rounded-[3rem] bg-white/5 border border-white/10 space-y-6 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                    <Eye className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Privacy Policy Summary</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed font-medium uppercase opacity-80">
                  Member PHI is encrypted at rest using AES-256 and protected via TLS 1.3 in transit. We maintain a strict 10-year retention policy for all audit logs and SOA records to satisfy CMS requirements. We never sell data to third parties.
                </p>
                <Button variant="link" className="text-primary font-black uppercase text-xs p-0 h-auto underline-offset-4" asChild>
                  <Link href="/privacy">View Full Privacy Policy <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
              </div>

              {/* Terms Summary */}
              <div className="p-10 rounded-[3rem] bg-white/5 border border-white/10 space-y-6 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
                    <Scale className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Terms of Service Summary</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed font-medium uppercase opacity-80">
                  Access to MediStay is reserved for licensed insurance agents. A signed Business Associate Agreement (BAA) is required for all active agency accounts. Agencies remain responsible for the clinical accuracy of automated check-ins and faxes.
                </p>
                <Button variant="link" className="text-accent font-black uppercase text-xs p-0 h-auto underline-offset-4" asChild>
                  <Link href="/terms">View Full Terms of Service <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
              </div>
            </div>

            <div className="pt-8 text-center">
              <div className="inline-flex items-center gap-8 px-8 py-4 rounded-full bg-white/5 border border-white/10">
                <Link href="/docs/hipaa-secure" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">HIPAA Compliant</span>
                </Link>
                <Link href="/docs/baa-agreement" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">BAA Ready</span>
                </Link>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AES-256 Sealed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 px-8 bg-muted/30">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black uppercase tracking-tighter">Scalable <span className="text-primary">Protection</span></h2>
              <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Plans for solo brokers and global agencies.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-10 rounded-[2.5rem] bg-background border border-border space-y-8 flex flex-col justify-between shadow-sm">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Entry Tier</h4>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-5xl font-black tracking-tighter">$29</span>
                      <span className="text-xs font-black text-muted-foreground">/MO</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {["100 Members", "MARx Switch Alerts", "Standard GHL Sync", "Email Alerts"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-black uppercase tracking-tight">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {item}
                      </div>
                    ))}
                  </div>
                </div>
                <Button className="w-full h-14 rounded-2xl border-2 border-primary text-primary bg-transparent hover:bg-primary/5 font-black uppercase text-xs" asChild>
                  <Link href="/dashboard">Get Started</Link>
                </Button>
              </div>

              <div className="p-10 rounded-[2.5rem] bg-primary text-white space-y-8 flex flex-col justify-between shadow-2xl shadow-primary/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10"><Zap className="w-32 h-32" /></div>
                <div className="space-y-6 relative z-10">
                  <div>
                    <Badge className="bg-white/20 text-white border-white/30 mb-4 font-black uppercase text-[9px] tracking-widest">Most Popular</Badge>
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary-foreground/70">Pro Agency</h4>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-5xl font-black tracking-tighter">$499</span>
                      <span className="text-xs font-black text-primary-foreground/70">/MO</span>
                    </div>
                    <p className="text-[10px] font-black uppercase text-accent mt-1 tracking-widest">$4,999 Billed Annually</p>
                  </div>
                  <div className="space-y-3">
                    {["Unlimited Members", "Maya AI Voice (500m/mo)", "Spruce Fax Center", "White-Label PDFs", "Priority Support"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-black uppercase tracking-tight">
                        <CheckCircle2 className="w-4 h-4 text-accent" /> {item}
                      </div>
                    ))}
                  </div>
                </div>
                <Button className="w-full h-14 rounded-2xl bg-white text-primary hover:bg-white/90 font-black uppercase text-xs relative z-10" asChild>
                  <Link href="/dashboard">Go Pro Now</Link>
                </Button>
              </div>

              <div className="p-10 rounded-[2.5rem] bg-background border border-border space-y-8 flex flex-col justify-between shadow-sm">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Enterprise</h4>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-5xl font-black tracking-tighter">Custom</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {["Full BAA Ownership", "On-Prem Deployment", "Custom AI Training", "API Endpoint Access", "Account Manager"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-black uppercase tracking-tight">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {item}
                      </div>
                    ))}
                  </div>
                </div>
                <Button className="w-full h-14 rounded-2xl border-2 border-border text-foreground bg-transparent hover:bg-muted font-black uppercase text-xs" asChild>
                  <Link href="/dashboard">Contact Sales</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-20 px-8 border-t border-border/50">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-black text-lg">
                  M
                </div>
                <span className="text-lg font-black tracking-tighter uppercase">MediStay</span>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed max-w-xs">
                The world's first autonomous retention system designed specifically for the Medicare market.
              </p>
            </div>
            
            <div className="space-y-4">
              <h5 className="text-[10px] font-black uppercase tracking-widest">Modules</h5>
              <ul className="space-y-2 text-[10px] font-black text-muted-foreground uppercase tracking-tight">
                <li><Link href="/docs/cms-switch" className="hover:text-primary transition-colors">CMS Switch Detection</Link></li>
                <li><Link href="/docs/maya-voice" className="hover:text-primary transition-colors">Maya AI Voice</Link></li>
                <li><Link href="/docs/spruce-fax" className="hover:text-primary transition-colors">Spruce Health Fax</Link></li>
                <li><Link href="/docs/ghl-sync" className="hover:text-primary transition-colors">GHL Integration</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-black uppercase tracking-widest">Agency</h5>
              <ul className="space-y-2 text-[10px] font-black text-muted-foreground uppercase tracking-tight">
                <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="/careers" className="hover:text-primary transition-colors">Careers</Link></li>
                <li><Link href="/docs/compliance-vault" className="hover:text-primary transition-colors">Compliance Vault</Link></li>
                <li><Link href="/docs/baa-agreement" className="hover:text-primary transition-colors">BAA Agreement</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-muted/50 border border-border/50">
                <Link href="/docs/hipaa-secure" className="flex items-center gap-2 text-muted-foreground mb-1 hover:text-primary transition-colors">
                  <Lock className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-widest">HIPAA SECURE</span>
                </Link>
                <p className="text-[9px] text-muted-foreground leading-relaxed font-bold uppercase tracking-tight opacity-60">
                  BAA Active: AWS/Twilio/Spruce Health. Records encrypted at rest.
                </p>
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto mt-20 pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">© 2025 MediStay Intelligence Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-[9px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary">Privacy Policy</Link>
              <Link href="/terms" className="text-[9px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </TooltipProvider>
    </div>
  )
}
