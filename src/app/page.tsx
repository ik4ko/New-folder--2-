
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ShieldCheck, Zap, Activity, Users, 
  ArrowRight, CheckCircle2, Lock, 
  Sparkles, Scale, Eye, ShieldAlert,
  Loader2, PlayCircle, Quote, Star,
  Smartphone, Mail, MessageSquare, Terminal,
  ExternalLink, BarChart3, PieChart, Info,
  Printer, PhoneCall, Link2
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

export default function LandingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agencyName, setAgencyName] = useState('')

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
      // Ensure all demo sessions are at least anonymously authenticated
      const userCredential = await signInAnonymously(auth)
      const db = getFirestore()
      
      await setDoc(doc(db, 'artifacts', 'medistay-production', 'users', userCredential.user.uid, 'profile', 'agency'), {
        agencyName: "Elite Demo Group",
        email: "demo@medistay.ai",
        createdAt: new Date().toISOString(),
        tier: 'Enterprise',
        isDemo: true
      })

      toast({ title: "Demo Mode Ready", description: "Launching test environment with simulated carrier data..." })
      router.push('/dashboard')
    } catch (error: any) {
      toast({ variant: "destructive", title: "Demo Initialization Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/10">
      {/* Navigation */}
      <header className="h-20 border-b border-border/50 px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
            M
          </div>
          <span className="text-xl font-black tracking-tighter uppercase">MediStay</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setAuthMode('login')} className="text-xs font-black uppercase tracking-widest">Log In</Button>
          <Button onClick={() => setAuthMode('signup')} className="rounded-xl h-11 px-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20 text-xs">Get Access</Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative py-24 md:py-32 px-8 overflow-hidden text-center max-w-6xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest border border-primary/20 mb-4">
            <Zap size={14} className="fill-primary" /> FOR HIGH-VOLUME MEDICARE AGENCIES
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] text-slate-900">
            Capture Every <br/><span className="text-primary">Switch Trigger.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-500 font-medium leading-relaxed max-w-3xl mx-auto mb-12">
            The first autonomous Medicare OS that stops churn by detecting disenrollment attempts in real-time, months before they finalize.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Button size="lg" onClick={() => setAuthMode('signup')} className="h-16 px-12 rounded-[2rem] text-lg font-black shadow-2xl shadow-primary/30 transition-all hover:scale-105">
              Start Production Node
            </Button>
            <Button size="lg" variant="outline" onClick={startDemoMode} className="h-16 px-12 rounded-[2rem] text-lg font-black border-2 transition-all hover:bg-slate-50 flex items-center gap-3">
              {loading ? <Loader2 className="animate-spin" /> : <PlayCircle size={20} />} Launch Demo
            </Button>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 px-8 max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tighter">Agency <span className="text-primary">Pricing</span></h2>
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Clinical Grade Retention Plans</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, i) => (
              <Card key={i} className={cn(
                "rounded-[2.5rem] border p-8 flex flex-col justify-between transition-all",
                tier.highlight ? "border-primary border-2 shadow-2xl scale-105 bg-primary/[0.02]" : "border-border shadow-sm hover:border-primary/30"
              )}>
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">{tier.name}</h3>
                    {tier.highlight && <Badge className="rounded-lg font-black uppercase text-[10px] px-2">Most Popular</Badge>}
                  </div>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black tracking-tighter">{tier.price}</span>
                      <span className="text-sm font-bold text-muted-foreground uppercase">/MO</span>
                    </div>
                    <p className="text-[10px] font-bold text-primary uppercase mt-1">OR {tier.yearly} / YEAR</p>
                  </div>
                  <p className="text-sm font-bold text-muted-foreground mb-8 uppercase leading-tight opacity-70">{tier.desc}</p>
                  <div className="space-y-4 mb-8">
                    {tier.features.map((f, j) => (
                      <div key={j} className="flex items-center gap-3 text-xs font-bold text-slate-600 uppercase tracking-tight">
                        <CheckCircle2 size={14} className="text-primary shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl" onClick={() => setAuthMode('signup')}>
                  Choose {tier.name}
                </Button>
              </Card>
            ))}
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-24 bg-slate-900 text-white px-8">
          <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <Quote className="text-primary mb-8 w-16 h-16 opacity-50" />
              <h2 className="text-5xl font-black tracking-tight leading-tight uppercase tracking-tighter">
                Trusted by 450+ <br/>Independent Agencies.
              </h2>
              <div className="flex gap-12">
                <div>
                  <p className="text-4xl font-black text-primary mb-1">$22M</p>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Commissions Saved</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-primary mb-1">94%</p>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Avg. Retention Rate</p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {reviews.map((rev, i) => (
                <Card key={i} className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] backdrop-blur-sm">
                  <div className="flex gap-1 mb-6">
                    {[...Array(rev.rating)].map((_, j) => <Star key={j} size={16} className="fill-primary text-primary" />)}
                  </div>
                  <p className="text-xl font-medium leading-relaxed mb-8 italic text-slate-200">"{rev.text}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center font-black">
                      {rev.name[0]}
                    </div>
                    <div>
                      <p className="font-black text-lg text-white uppercase tracking-tight">{rev.name}</p>
                      <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">{rev.role}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 px-8 max-w-6xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tighter">Retention <span className="text-primary">Intelligence</span></h2>
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Clinical grade member protection modules.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'MARx Switch Detection', desc: 'Instantly detect carrier switches via nightly snapshot polls from CMS.', icon: Activity, href: "/docs/cms-switch" },
              { title: 'EDI Operations', desc: 'Secure X12 handshakes via Stedi Core for real-time eligibility checks.', icon: Terminal, href: "/docs/introduction" },
              { title: 'Maya AI Voice Agent', desc: 'Autonomous milestone check-ins at Day 7, 30, and 75 to gauge sentiment.', icon: PhoneCall, href: "/docs/maya-voice" },
              { title: 'SSBCI Fax Automation', desc: 'Auto-verify chronic conditions with PCP offices via secure clinical fax.', icon: Printer, href: "/docs/spruce-fax" },
              { title: 'AEP Shield', desc: 'Orchestrate loyalty campaigns before the high-churn disenrollment window.', icon: ShieldCheck, href: "/docs/compliance-vault" },
              { title: 'CRM Sync Bridge', desc: 'Two-way synchronization with GoHighLevel for automated outreach.', icon: Link2, href: "/docs/ghl-sync" },
            ].map((feature, i) => (
              <Card key={i} className="p-10 rounded-[2.5rem] border border-border space-y-6 hover:border-primary/30 transition-all group cursor-pointer" onClick={() => router.push(feature.href)}>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tight">{feature.title}</h3>
                  <p className="text-sm font-bold text-muted-foreground uppercase leading-relaxed opacity-70">
                    {feature.desc}
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                  Explore Module <ArrowRight className="w-3 h-3" />
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-20 px-8 border-t border-border/50 text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black">M</div>
          <span className="text-xl font-black tracking-tighter uppercase">MediStay</span>
        </div>
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-8">© 2026 MediStay Intelligence Inc. HIPAA Compliant.</p>
        <div className="flex justify-center gap-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link href="/docs/baa-agreement" className="hover:text-primary transition-colors">BAA Agreement</Link>
        </div>
      </footer>

      {/* Auth Modal */}
      {authMode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setAuthMode(null)}></div>
          <Card className="relative w-full max-w-md rounded-[3rem] shadow-2xl p-12 text-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-8 font-black text-white text-3xl italic">M</div>
            <h2 className="text-3xl font-black mb-2 text-slate-900 uppercase tracking-tighter">{authMode === 'login' ? 'Agency Access' : 'Provision Node'}</h2>
            <p className="text-center text-slate-400 text-xs font-black mb-8 uppercase tracking-widest opacity-70">MediStay Retention OS</p>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Legal Agency Name</Label>
                  <Input 
                    required
                    placeholder="e.g. Elite Medicare Group" 
                    className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Agent Email</Label>
                <Input 
                  required
                  type="email"
                  placeholder="name@agency.com" 
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Secure Password</Label>
                <Input 
                  required
                  type="password"
                  placeholder="••••••••" 
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-16 rounded-3xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg mt-4 shadow-xl uppercase tracking-tighter">
                {loading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? 'Enter Command Center' : 'Initialize Workspace')}
              </Button>
            </form>

            <div className="mt-8 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="hover:text-primary">
                {authMode === 'login' ? "Create Agency Account" : "Back to Login"}
              </button>
              <button className="hover:text-primary">Forgot Key</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
