import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Add authentication logic here
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/10 scroll-smooth overflow-y-auto">
      <header className="h-20 border-b border-border px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-10">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
            M
          </div>
          <span className="text-xl font-black tracking-tighter uppercase">MediStay</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/signup" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Sign Up</Link>
        </nav>
      </header>
      <main className="flex-1 py-20 px-8">
        <div className="max-w-7xl mx-auto text-center space-y-10">
          <h2 className="text-4xl font-black uppercase tracking-tighter">Log In</h2>
          <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
            <div className="flex items-center mb-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-slate-400">Email</Label>
              <Input
                type="email"
                placeholder="name@agency.com"
                className="h-16 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6 focus:ring-primary shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex items-center mb-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-2 text-slate-400">Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                className="h-16 rounded-2xl bg-slate-50 border-slate-100 font-bold px-6 focus:ring-primary shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-20 rounded-3xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xl mt-6 shadow-2xl uppercase tracking-tighter transition-all"
            >
              Log In
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}