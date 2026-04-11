"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

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

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/10">
      <header className="h-20 border-b border-border px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
            M
          </div>
          <span className="text-xl font-black tracking-tighter uppercase">MediStay</span>
        </Link>
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest">
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Home</Link>
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md w-full rounded-[3rem] shadow-2xl p-12 border-none bg-card">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-4xl font-black uppercase tracking-tighter">Agency Access</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">MediStay Retention OS</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-muted-foreground">Agent Email</Label>
              <Input
                required
                type="email"
                placeholder="name@agency.com"
                className="h-16 rounded-2xl bg-muted/50 border-border font-bold px-6 focus:ring-primary shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-muted-foreground">Password</Label>
              <Input
                required
                type="password"
                placeholder="••••••••"
                className="h-16 rounded-2xl bg-muted/50 border-border font-bold px-6 focus:ring-primary shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-20 rounded-3xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xl mt-4 shadow-2xl uppercase tracking-tighter transition-all"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Log In"}
            </Button>
          </form>

          <div className="mt-10 flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">
            <Link href="/signup" className="hover:text-primary transition-colors">Create Agency Node</Link>
            <button type="button" className="hover:text-primary transition-colors">Forgot Key</button>
          </div>
        </Card>
      </main>
    </div>
  );
}
