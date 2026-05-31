"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/logo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Zap, Building2, ArrowLeft, Loader2, ShieldCheck, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const BROKER_FEATURES = [
  '1 broker seat',
  'My Book contact management',
  'GoHighLevel integration',
  'VCC Form automation',
  'Churn detection alerts',
  'AEP Shield campaigns',
  'AI retention scripts',
  'Aegis Lock — CMS-1696 AOR',
]

const AGENCY_FEATURES = [
  '5 seats included (owner + managers + CS + brokers)',
  'Additional brokers: +$49/seat/month',
  'Everything in Broker tier',
  'Team management with role permissions',
  'Manager visibility dashboard',
  'Revenue-at-risk monitoring',
  'Master roster import',
  'Submit VCC on behalf of any broker',
  'Priority support',
]

export default function PricingPage() {
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = useState<'broker' | 'agency' | null>(null)

  const handleCheckout = async (plan: 'broker' | 'agency') => {
    setLoadingPlan(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error ?? 'Checkout failed')
      }
    } catch (err: any) {
      alert(err.message)
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="h-20 px-8 flex items-center justify-between border-b border-white/10">
        <Link href="/"><Logo /></Link>
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest text-white/60 hover:text-white hover:bg-white/10">
          <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Dashboard</Link>
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-20">
        {/* Headline */}
        <div className="text-center space-y-4 mb-16">
          <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[10px] tracking-widest px-4 py-1.5">
            Simple Pricing
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
            Protect Your Book
          </h1>
          <p className="text-white/50 font-bold text-sm max-w-xl mx-auto">
            AOR fulfillment, VCC automation, and retention intelligence — priced for Medicare agencies.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Broker */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-black uppercase tracking-widest text-[11px] text-white/60">Broker</p>
                <p className="font-black text-lg text-white">Solo Broker</p>
              </div>
            </div>

            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-5xl font-black">$149</span>
              <span className="text-white/40 font-black text-xs uppercase tracking-widest">/month</span>
            </div>
            <p className="text-white/40 text-[11px] font-medium mb-8">
              For independent brokers managing their own book of business
            </p>

            <ul className="space-y-3 mb-8 flex-1">
              {BROKER_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-[12px] font-medium text-white/70">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleCheckout('broker')}
              disabled={!!loadingPlan}
              variant="outline"
              className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-white/20 text-white hover:bg-white hover:text-slate-950 transition-all"
            >
              {loadingPlan === 'broker' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get Started'}
            </Button>
          </div>

          {/* Agency */}
          <div className={cn(
            "rounded-3xl border p-8 flex flex-col relative overflow-hidden",
            "border-primary bg-primary/5"
          )}>
            <div className="absolute top-4 right-4">
              <Badge className="bg-primary text-white font-black uppercase text-[9px] tracking-widest px-3 py-1">
                Most Popular
              </Badge>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-black uppercase tracking-widest text-[11px] text-primary/70">Agency</p>
                <p className="font-black text-lg text-white">Full Agency</p>
              </div>
            </div>

            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-5xl font-black">$749</span>
              <span className="text-white/40 font-black text-xs uppercase tracking-widest">/month</span>
            </div>
            <p className="text-white/40 text-[11px] font-medium mb-8">
              For agencies with brokers — includes 5 seats (owner + 4)
            </p>

            <ul className="space-y-3 mb-8 flex-1">
              {AGENCY_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-[12px] font-medium text-white/70">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => handleCheckout('agency')}
              disabled={!!loadingPlan}
              className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
            >
              {loadingPlan === 'agency' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upgrade Now'}
            </Button>
          </div>
        </div>

        {/* Add-on seats note */}
        <div className="mt-8 p-5 rounded-2xl border border-white/10 bg-white/5 flex items-start gap-3">
          <Plus className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[12px] font-medium text-white/60">
            <span className="text-white font-bold">Need more brokers?</span> Add broker seats at{' '}
            <span className="text-white font-bold">$49/month each.</span>{' '}
            Contact us at{' '}
            <a href="mailto:growth@aegissage.com" className="text-primary underline underline-offset-2">
              growth@aegissage.com
            </a>
          </p>
        </div>

        {/* Trust footer */}
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            HIPAA-compliant · BAA included · Cancel anytime
          </div>
          <p className="text-[10px] text-white/20 font-medium max-w-sm">
            Not connected with or endorsed by the U.S. government or the federal Medicare program.
          </p>
        </div>
      </main>
    </div>
  )
}
