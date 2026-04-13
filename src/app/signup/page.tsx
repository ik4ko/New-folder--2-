
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Rocket, Building2, Mail, Key } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const authBg = PlaceHolderImages.find(img => img.id === 'auth-bg');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(db, 'agencies', userCredential.user.uid), {
        agencyName,
        email,
        createdAt: new Date().toISOString(),
        trialExpires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'trialing',
        tier: 'Entry',
        billingPlan: 'entry',
        isTrialInitialized: false
      });

      toast({ title: "Account Created", description: "Identity verified. Please log in to initialize your agency trial." });
      
      // Redirect to login as requested
      router.push('/login');
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Registration Failed", 
        description: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-slate-950 text-foreground selection:bg-primary/10 overflow-hidden">
      {/* Full Screen Background Image */}
      <div className="absolute inset-0 z-0">
        {isMounted && (
          <Image
            src={authBg?.imageUrl || "https://picsum.photos/seed/med1/2400/1600"}
            alt="Authentication Background"
            fill
            className="object-cover opacity-60"
            priority
            data-ai-hint="medical laboratory"
          />
        )}
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
        <Card className="max-w-md w-full rounded-[3.5rem] shadow-2xl p-10 border border-white/10 bg-white/5 dark:bg-slate-900/20 backdrop-blur-2xl animate-in zoom-in-95 duration-500">
          <div className="text-center space-y-2 mb-8">
            <div className="flex justify-center mb-4">
              <Logo iconOnly className="scale-125" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Provision Node</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Initialize Agency Trial</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-white/70">Legal Agency Name</Label>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
                <Input
                  required
                  placeholder="e.g. Elite Medicare Group"
                  className="h-14 rounded-2xl bg-white/5 border-white/10 text-white pl-12 font-bold placeholder:text-white/20 focus:ring-primary focus:border-primary/50 shadow-inner"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                />
              </div>
            </div>
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
              <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-white/70">Secure Password</Label>
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
              {loading ? <Loader2 className="animate-spin" /> : <>Register & Continue <Rocket className="w-5 h-5" /></>}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/10 text-center text-[10px] font-black text-white/50 uppercase tracking-widest">
            <Link href="/login" className="hover:text-primary transition-colors">Already a partner? Log In</Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
