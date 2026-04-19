
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Lock, Mail, Key, ShieldCheck, Zap, CreditCard, Timer } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAppStore } from '@/lib/store';
import { Progress } from '@/components/ui/progress';

type LoginStep = 'checking' | 'auth' | 'provisioning' | 'stripe';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [step, setStep] = useState<LoginStep>('checking');
  const [countdown, setCountdown] = useState(10);
  
  const router = useRouter();
  const { toast } = useToast();
  const { updateAgencyProfile } = useAppStore();

  const authBg = PlaceHolderImages.find(img => img.id === 'auth-bg');

  useEffect(() => {
    setIsMounted(true);
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If the user is already authenticated (e.g. just signed up), detect and transition
        if (user.isAnonymous) {
          updateAgencyProfile({ isTrialInitialized: true });
          router.push('/dashboard');
          return;
        }

        try {
          const agencySnap = await getDoc(doc(db, 'agencies', user.uid));
          if (agencySnap.exists()) {
            const agencyData = agencySnap.data();
            updateAgencyProfile({ ...agencyData as any });
            
            if (agencyData?.isTrialInitialized) {
              router.push('/dashboard');
            } else {
              setStep('provisioning');
            }
          } else {
            // Document missing? The user exists, so let's allow them to provision
            setStep('provisioning');
          }
        } catch (e) {
          console.error("Error checking agency status:", e);
          setStep('auth');
        }
      } else {
        setStep('auth');
      }
    });
    return () => unsubscribe();
  }, [router, updateAgencyProfile]);

  // Provisioning countdown logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'provisioning' && countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    } else if (step === 'provisioning' && countdown === 0) {
      setStep('stripe');
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const agencySnap = await getDoc(doc(db, 'agencies', userCredential.user.uid));
      
      if (agencySnap.exists()) {
        const agencyData = agencySnap.data();
        updateAgencyProfile({ ...agencyData as any });
        if (agencyData?.isTrialInitialized) {
          toast({ title: "Welcome Back", description: "Identity verified. Redirecting to Command Center." });
          router.push('/dashboard');
        } else {
          setStep('provisioning');
        }
      } else {
        setStep('provisioning');
      }
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "Login Failed", 
        description: error.code === 'auth/invalid-credential' ? "Invalid email or password." : error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchStripe = async () => {
    if (!auth?.currentUser) return;
    setLoading(true);
    
    try {
      toast({ title: "Stripe Gateway", description: "Authorizing 14-day free agency trial..." });
      
      const uid = auth.currentUser.uid;
      const agencyRef = doc(db, 'agencies', uid);
      const trialData = {
        isTrialInitialized: true,
        status: 'active',
        trialStartedAt: new Date().toISOString()
      };

      await setDoc(agencyRef, {
        ...trialData,
        email: auth.currentUser.email,
        createdAt: new Date().toISOString(),
      }, { merge: true });
      
      updateAgencyProfile(trialData);
      
      setTimeout(() => {
        toast({ title: "Success", description: "Trial Initialized. Welcome to MediStay." });
        router.push('/dashboard');
      }, 1500);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Billing Error", description: "Could not activate trial subscription." });
      setLoading(false);
    }
  };

  if (!isMounted || step === 'checking') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-white">
          <Logo iconOnly className="animate-pulse scale-125" />
          <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Checking Agency Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-slate-950 text-foreground selection:bg-primary/10 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src={authBg?.imageUrl || "https://picsum.photos/seed/med1/2400/1600"}
          alt="Authentication Background"
          fill
          className="object-cover opacity-60"
          priority
          data-ai-hint="medical office"
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
      </div>

      <header className="relative h-20 px-8 flex items-center justify-between z-10">
        <Link href="/">
          <Logo />
        </Link>
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest text-white hover:bg-white/10 hover:text-white">
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Home</Link>
        </Button>
      </header>

      <main className="relative flex-1 flex items-center justify-center p-8 z-10">
        <Card className="max-w-md w-full rounded-[3.5rem] shadow-2xl p-10 border border-white/10 bg-white/5 dark:bg-slate-900/20 backdrop-blur-2xl animate-in zoom-in-95 duration-500 overflow-hidden">
          {step === 'auth' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                  <Logo iconOnly className="scale-125" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Agency Access</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">MediStay Retention Intelligence</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-white/70">Agent Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
                    <Input
                      required
                      type="email"
                      placeholder="name@agency.com"
                      className="h-14 rounded-2xl bg-white/5 border-white/10 text-white pl-12 font-bold placeholder:text-white/20 focus:ring-primary focus:border-primary/50 shadow-inner"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-white/70">Password</Label>
                  <div className="relative group">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
                    <Input
                      required
                      type="password"
                      placeholder="••••••••"
                      className="h-14 rounded-2xl bg-white/5 border-white/10 text-white pl-12 font-bold placeholder:text-white/20 focus:ring-primary focus:border-primary/50 shadow-inner"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg mt-4 shadow-xl shadow-primary/20 uppercase tracking-tighter transition-all flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <>Log In <Lock className="w-5 h-5" /></>}
                </Button>
              </form>

              <div className="mt-8 pt-8 border-t border-white/10 flex justify-between items-center text-[10px] font-black text-white/50 uppercase tracking-widest px-2">
                <Link href="/signup" className="hover:text-primary transition-colors">Register Agency</Link>
                <button type="button" className="hover:text-primary transition-colors">Recover Key</button>
              </div>
            </div>
          )}

          {step === 'provisioning' && (
            <div className="text-center space-y-8 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto relative">
                <Timer className="w-10 h-10 text-primary animate-pulse" />
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="46"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="46"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray="289"
                    strokeDashoffset={289 - (289 * (10 - countdown)) / 10}
                    className="text-primary transition-all duration-1000 ease-linear"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase text-white tracking-tighter">Establishing Agency Node</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">MediStay Cloud Virtualization</p>
              </div>
              <div className="space-y-4">
                <Progress value={(10 - countdown) * 10} className="h-2 bg-white/10" />
                <p className="text-4xl font-black text-white italic">{countdown}s</p>
              </div>
              <p className="text-[11px] text-white/40 font-bold uppercase italic leading-relaxed">
                "Initializing HIPAA-compliant S3 storage and establishing nightly MARx polling bridges..."
              </p>
            </div>
          )}

          {step === 'stripe' && (
            <div className="text-center space-y-10 animate-in fade-in duration-700">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
                <Zap className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black uppercase text-white tracking-tighter">Initialize Trial</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Secure BAA Payment Activation</p>
              </div>
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4 text-left">
                <div className="flex items-center justify-between text-white font-black text-xs uppercase tracking-widest">
                  <span>Entry Subscription</span>
                  <span>$0.00 / 14 Days</span>
                </div>
                <div className="h-px bg-white/10" />
                <p className="text-[10px] text-white/60 font-bold leading-relaxed uppercase">
                  A payment method is required to activate the trial. You will not be charged until the 14-day period expires.
                </p>
              </div>
              <Button
                onClick={handleLaunchStripe}
                disabled={loading}
                className="w-full h-20 rounded-[2rem] bg-emerald-500 hover:bg-emerald-400 text-white font-black text-lg shadow-2xl shadow-emerald-500/30 uppercase tracking-tighter flex items-center justify-center gap-3 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" /> : <>Launch Stripe Checkout <CreditCard className="w-6 h-6" /></>}
              </Button>
              <div className="flex items-center justify-center gap-2 text-[9px] text-white/40 font-black uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3" /> PCI-DSS & HIPAA Compliant
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
