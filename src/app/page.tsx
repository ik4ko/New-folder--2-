
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ShieldCheck, Zap, Activity, Users, 
  ArrowRight, CheckCircle2, 
  Sparkles, ShieldAlert,
  Loader2, PlayCircle, Quote, Star,
  Terminal, Printer, PhoneCall, Link2,
  Lock, MousePointer2, BarChart3, Search,
  Database, UserCheck, ShieldPlus, X
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  signInAnonymously
} from "firebase/auth"
import { getFirestore, doc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"

export default function LandingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const importFromGHL = useAppStore(s => s.importFromGHL)

  const reviews = [
    {
      name: "Brenda Rollins",
      role: "Owner, Gulf Coast Medicare",
      text: "MediStay detected 14 'stealth' disenrollements in our first week. It paid for itself in one AEP cycle.",
      rating: 5
    },
    {
      name: "Michael Cho",
      role: "Director, Senior Health Partners",
      text: "The LIS auto-filler is a game changer. We've moved 200 members to Extra Help without hiring extra staff.",
      rating: 5
    }
  ];

  const pricingTiers = [
    {
      name: "Entry",
      price: "$99",
      yearly: "$999",
      desc: "For independent solo agents.",
      features: ["MARx Switch Monitoring", "Basic GHL Sync", "Manual Member Intake", "Standard CRM Dashboard"]
    },
    {
      name: "Starter",
      price: "$299",
      yearly: "$2,990",
      desc: "For small growth-focused agencies.",
      features: ["LIS Opportunity Scanner", "Bulk SSBCI Faxing", "Maya AI Voice (Lite)", "Custom CRM Field Mapping"],
      highlight: true
    },
    {
      name: "Pro",
      price: "$499",
      yearly: "$4,990",
      desc: "For high-volume call centers.",
      features: ["Predictive Churn AI", "AEP Shield Prep", "Full Maya AI Agent", "Enterprise BAA & Audit Log"]
    }
  ]

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const auth = getAuth()
    
    try {
      await setPersistence(auth, browserLocalPersistence)
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
        toast({ title: "Welcome Back", description: "Accessing agency node..." })
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const db = getFirestore()
        await setDoc(doc(db, 'artifacts', 'medistay-production', 'users', userCredential.user.uid, 'profile', 'agency'), {
          agencyName,
          email,
          createdAt: new Date().toISOString(),
          tier: 'Basic'
        })
        toast({ title: "Agency Provisioned", description: "Workspace initialized successfully." })
      }
      router.push('/dashboard')
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Authentication Failed", 
        description: error.message 
      })
    } finally {
      setLoading(false)
    }
  }

  const startDemoMode = async () => {
    setLoading(true)
    const auth = getAuth()
    try {
      const userCredential = await signInAnonymously(auth)
      const db = getFirestore()
      
      // Seed randomized data for the demo
      importFromGHL(12)
      
      await setDoc(doc(db, 'artifacts', 'medistay-production', 'users', userCredential.user.uid, 'profile', 'agency'), {
        agencyName: "Elite Demo Group",
        email: "demo@medistay.ai",
        createdAt: new Date().toISOString(),
        tier: 'Enterprise',
        isDemo: true
      })

      toast({ title: "Demo Mode Ready", description: "Launching sandbox with simulated carrier data..." })
      router.push('/dashboard')
    } catch (error: any) {
      toast({ variant: "destructive", title: "Demo Initialization Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/10 scroll-smooth overflow-y-auto">
      {/* Navigation */}
      <header className="h-20 border-b border-border/50 px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
              M
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">MediStay</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Features</Link>
            <Link href="#pricing" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
            <Link href="#reviews" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Reviews</Link>
            <Link href="/docs/introduction" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Docs</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setAuthMode('login')} className="text-xs font-black uppercase tracking-widest">Log In</Button>
          <Button onClick={() => setAuthMode('signup')} className="rounded-xl h-11 px-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-xs">Get Access</Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section - High Contrast Update */}
        <section id="hero" className="relative py-20 md:py-32 px-8">
          <div className="max-w-7xl mx-auto bg-slate-900 rounded-[4rem] p-12 md:p-32 text-center space-y-10 border border-white/5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest border border-primary/20 mb-4">
              <Zap size={14} className="fill-primary" /> AGENT GRADE RETENTION OS
            </div>
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.85] text-white">
              Capture Every <br/><span className="text-primary">Switch Trigger.</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed max-w-3xl mx-auto mb-12">
              The first autonomous Medicare platform that stops churn by detecting disenrollment attempts in real-time, months before they finalize.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Button size="lg" onClick={() => setAuthMode('signup')} className="h-20 px-16 rounded-[2.5rem] text-xl font-black shadow-2xl shadow-primary/30 transition-all hover:scale-105 bg-primary hover:bg-primary/90 text-white">
                Start Production Node
              </Button>
              <Button size="lg" variant="outline" onClick={startDemoMode} className="h-20 px-16 rounded-[2.5rem] text-xl font-black border-2 border-white/10 text-white hover:bg-white/5 transition-all flex items-center gap-3">
                {loading ? <Loader2 className="animate-spin" /> : <PlayCircle size={24} />} Launch Demo
              </Button>
            </div>
          </div>
        </section>

        {/* 6 Core Demos */}
        <section id="features" className="py-32 px-8 max-w-7xl mx-auto space-y-24">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-5xl font-black uppercase tracking-tighter">Retention <span className="text-primary">Intelligence</span></h2>
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Six clinical grade modules designed to protect your agency's renewal revenue.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                title: 'MARx Switch Detection', 
                desc: 'Instantly detect carrier switches via nightly snapshot polls from CMS. 24-hour retention window.', 
                icon: Activity, 
                demo: 'Detected "Stealth" switch for Member ID 9KL2...' 
              },
              { 
                title: 'EDI Operations', 
                desc: 'Secure X12 handshakes via Stedi Core for real-time eligibility checks and enrollment validation.', 
                icon: Terminal,
                demo: 'Eligibility 270/271 verified in 42ms.'
              },
              { 
                title: 'Maya AI Voice Agent', 
                desc: 'Autonomous milestone check-ins at Day 7, 30, and 75. Detects dissatisfaction tone before it turns into churn.', 
                icon: PhoneCall,
                demo: 'Maya: "Ensuring you received your ID card..."'
              },
              { 
                title: 'SSBCI Fax Automation', 
                desc: 'Auto-verify chronic conditions with PCP offices via secure Spruce Health clinical fax bridge.', 
                icon: Printer,
                demo: 'Clinical verification transmitted to Provider NPI-992.'
              },
              { 
                title: 'LIS Gap Analysis', 
                desc: 'Scan your roster for members eligible for LIS/Extra Help. Increase loyalty by saving them $5,000+/yr.', 
                icon: Search,
                demo: 'Identified 14 members for LIS enrollment.'
              },
              { 
                title: 'AEP Shield Orchestrator', 
                desc: 'Orchestrate loyalty campaigns and preference mapping (SMS/Mail) before the high-churn windows.', 
                icon: ShieldPlus,
                demo: 'AEP Shield: 98% Protection Score active.'
              },
            ].map((feature, i) => (
              <Card key={i} className="p-10 rounded-[3rem] border border-border space-y-8 hover:border-primary/30 transition-all group bg-card shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                  <feature.icon className="w-8 h-8" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black uppercase tracking-tight">{feature.title}</h3>
                  <p className="text-sm font-bold text-muted-foreground uppercase leading-relaxed opacity-70">
                    {feature.desc}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-[10px] text-primary/70 font-black uppercase tracking-tighter">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE_DEMO_SIGNAL
                  </div>
                  {feature.demo}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-32 px-8 bg-slate-50 border-y border-border/50">
          <div className="max-w-7xl mx-auto space-y-20">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black uppercase tracking-tighter">Agency <span className="text-primary">Pricing</span></h2>
              <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Clinical Grade Retention Plans for Agencies of all sizes.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pricingTiers.map((tier, i) => (
                <Card key={i} className={cn(
                  "rounded-[3.5rem] border p-10 flex flex-col justify-between transition-all bg-white",
                  tier.highlight ? "ring-2 ring-primary shadow-2xl scale-105" : "border-border shadow-sm hover:border-primary/30"
                )}>
                  <div>
                    <div className="flex justify-between items-start mb-8">
                      <h3 className="text-2xl font-black uppercase tracking-tighter">{tier.name}</h3>
                      {tier.highlight && <Badge className="rounded-lg font-black uppercase text-[10px] px-3 py-1 bg-primary text-white">Most Popular</Badge>}
                    </div>
                    <div className="mb-8">
                      <div className="flex items-baseline gap-1">
                        <span className="text-6xl font-black tracking-tighter">{tier.price}</span>
                        <span className="text-sm font-bold text-muted-foreground uppercase">/MO</span>
                      </div>
                      <p className="text-[10px] font-bold text-primary uppercase mt-2 tracking-widest">OR {tier.yearly} / YEAR</p>
                    </div>
                    <p className="text-sm font-bold text-muted-foreground mb-10 uppercase leading-snug opacity-70">{tier.desc}</p>
                    <div className="space-y-5 mb-10">
                      {tier.features.map((f, j) => (
                        <div key={j} className="flex items-center gap-4 text-xs font-black text-slate-600 uppercase tracking-tight">
                          <CheckCircle2 size={16} className="text-primary shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full h-16 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl bg-slate-900 text-white hover:bg-primary transition-all" onClick={() => setAuthMode('signup')}>
                    Choose {tier.name}
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section id="reviews" className="py-32 bg-slate-950 text-white px-8">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
              <Quote className="text-primary mb-8 w-20 h-20 opacity-50" />
              <h2 className="text-6xl font-black tracking-tight leading-[0.9] uppercase tracking-tighter">
                Trusted by 450+ <br/>Independent Agencies.
              </h2>
              <div className="flex gap-16">
                <div>
                  <p className="text-5xl font-black text-primary mb-2">$22M</p>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Commissions Saved</p>
                </div>
                <div>
                  <p className="text-5xl font-black text-primary mb-2">94%</p>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Avg. Retention Rate</p>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              {reviews.map((rev, i) => (
                <div key={i} className="bg-white/5 border border-white/10 p-12 rounded-[3.5rem] backdrop-blur-xl hover:bg-white/10 transition-all">
                  <div className="flex gap-1 mb-8">
                    {[...Array(rev.rating)].map((_, j) => <Star key={j} size={18} className="fill-primary text-primary" />)}
                  </div>
                  <p className="text-2xl font-medium leading-relaxed mb-10 italic text-slate-200">"{rev.text}"</p>
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center font-black text-xl">
                      {rev.name[0]}
                    </div>
                    <div>
                      <p className="font-black text-xl text-white uppercase tracking-tight">{rev.name}</p>
                      <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em] mt-1">{rev.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-32 px-8 border-t border-border/50 text-center">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xl">M</div>
          <span className="text-2xl font-black tracking-tighter uppercase">MediStay</span>
        </div>
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-10">© 2026 MediStay Intelligence Inc. HIPAA Compliant.</p>
        <div className="flex justify-center gap-10 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link href="/docs/baa-agreement" className="hover:text-primary transition-colors">BAA Agreement</Link>
        </div>
      </footer>

      {/* Auth Modal */}
      {authMode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setAuthMode(null)}></div>
          <Card className="relative w-full max-w-md rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] p-12 text-center animate-in zoom-in-95 duration-300 overflow-hidden bg-white border-none">
            <button onClick={() => setAuthMode(null)} className="absolute top-8 right-8 p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <X size={24} />
            </button>
            <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-10 font-black text-white text-4xl italic shadow-2xl shadow-primary/20">M</div>
            <h2 className="text-4xl font-black mb-3 text-slate-900 uppercase tracking-tighter">{authMode === 'login' ? 'Agency Access' : 'Provision Node'}</h2>
            <p className="text-center text-slate-400 text-xs font-black mb-10 uppercase tracking-widest opacity-70">MediStay Retention OS</p>
            
            <form onSubmit={handleAuth} className="space-y-5">
              {authMode === 'signup' && (
                <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-slate-400">Legal Agency Name</Label>
                  <Input 
                    required
                    placeholder="e.g. Elite Medicare Group" 
                    className="h-16 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6 focus:ring-primary shadow-inner"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-slate-400">Agent Email</Label>
                <Input 
                  required
                  type="email"
                  placeholder="name@agency.com" 
                  className="h-16 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6 focus:ring-primary shadow-inner"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-slate-400">Secure Password</Label>
                <Input 
                  required
                  type="password"
                  placeholder="••••••••" 
                  className="h-16 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6 focus:ring-primary shadow-inner"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-20 rounded-3xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xl mt-6 shadow-2xl uppercase tracking-tighter transition-all">
                {loading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? 'Enter Command Center' : 'Initialize Workspace')}
              </Button>
            </form>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button 
              variant="outline" 
              onClick={startDemoMode} 
              disabled={loading}
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-primary/20 text-primary hover:bg-primary/5 transition-all"
            >
              Launch Demo Environment
            </Button>

            <div className="mt-10 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
              <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="hover:text-primary transition-colors">
                {authMode === 'login' ? "Create Agency Account" : "Back to Login"}
              </button>
              <button className="hover:text-primary transition-colors">Forgot Key</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
