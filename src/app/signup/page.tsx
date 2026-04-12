
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
import { Loader2, ArrowLeft, Rocket } from 'lucide-react';
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
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Initialize Agency Record in Firestore
      await setDoc(doc(db, 'agencies', userCredential.user.uid), {
        agencyName,
        email,
        createdAt: new Date().toISOString(),
        trialExpires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'trialing',
        tier: 'Entry',
        billingPlan: 'entry'
      });

      toast({ title: "Agency Provisioned", description: "Your 14-day free trial has been initialized." });
      router.push('/dashboard');
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

  if (!isMounted) return null;

  return (
    <div className="relative flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/10 overflow-hidden">
      {/* Background Image */}
      {authBg && (
        <div className="absolute inset-0 z-0">
          <Image
            src={authBg.imageUrl}
            alt="Authentication Background"
            fill
            className="object-cover"
            priority
            data-ai-hint={authBg.imageHint}
          />
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />
        </div>
      )}

      <header className="relative h-20 px-8 flex items-center justify-between z-10">
        <Link href="/">
          <Logo className="text-white" />
        </Link>
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest text-white hover:bg-white/10">
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Home</Link>
        </Button>
      </header>

      <main className="relative flex-1 flex items-center justify-center p-8 z-10">
        <Card className="max-w-md w-full rounded-[3rem] shadow-2xl p-12 border border-white/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <div className="text-center space-y-2 mb-10">
            <div className="flex justify-center mb-6">
              <Logo iconOnly className="scale-125" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter text-foreground">Provision Node</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Start 14-Day Free Trial</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-muted-foreground">Legal Agency Name</Label>
              <Input
                required
                placeholder="e.g. Elite Medicare Group"
                className="h-16 rounded-2xl bg-white/50 dark:bg-slate-800/50 border-border font-bold px-6 focus:ring-primary shadow-inner"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-muted-foreground">Agent Email</Label>
              <Input
                required
                type="email"
                placeholder="name@agency.com"
                className="h-16 rounded-2xl bg-white/50 dark:bg-slate-800/50 border-border font-bold px-6 focus:ring-primary shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-muted-foreground">Secure Password</Label>
              <Input
                required
                type="password"
                placeholder="••••••••"
                className="h-16 rounded-2xl bg-white/50 dark:bg-slate-800/50 border-border font-bold px-6 focus:ring-primary shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-20 rounded-3xl bg-slate-900 dark:bg-primary hover:bg-slate-800 dark:hover:bg-primary/90 text-white font-black text-xl mt-4 shadow-2xl uppercase tracking-tighter transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Initialize Trial <Rocket className="w-5 h-5" /></>}
            </Button>
          </form>

          <div className="mt-10 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            <Link href="/login" className="hover:text-primary transition-colors">Already registered? Log In</Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
