
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Lock, Mail, Key } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Welcome Back", description: "Accessing your agency Command Center..." });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Login Failed", 
        description: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="relative flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/10 overflow-hidden">
      {/* Full Screen Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={authBg?.imageUrl || "https://picsum.photos/seed/med1/2400/1600"}
          alt="Authentication Background"
          fill
          className="object-cover"
          priority
          data-ai-hint="medical laboratory"
        />
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[4px]" />
      </div>

      <header className="relative h-20 px-8 flex items-center justify-between z-10">
        <Link href="/">
          <Logo className="text-white brightness-200" />
        </Link>
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest text-white hover:bg-white/10 hover:text-white">
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Home</Link>
        </Button>
      </header>

      <main className="relative flex-1 flex items-center justify-center p-8 z-10">
        <Card className="max-w-md w-full rounded-[3rem] shadow-2xl p-10 border border-white/20 bg-white/10 dark:bg-slate-900/40 backdrop-blur-2xl animate-in zoom-in-95 duration-500">
          <div className="text-center space-y-2 mb-8">
            <div className="flex justify-center mb-4">
              <Logo iconOnly className="scale-125 brightness-200" />
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
        </Card>
      </main>
    </div>
  );
}
