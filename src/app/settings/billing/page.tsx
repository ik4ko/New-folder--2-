"use client"

import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CreditCard, ShoppingBag, ExternalLink, Save } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"

export default function BillingSettingsPage() {
  const router = useRouter()
  const { updateAgencyProfile } = useAppStore()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const handleUpdatePlan = (plan: 'entry' | 'starter' | 'pro' | 'enterprise') => {
    updateAgencyProfile({ billingPlan: plan, isSubscriptionActive: true })
  }

  const handleStripeCheckout = (action: 'confirm' | 'decline') => {
    setIsCheckoutOpen(false)
    if (action === 'confirm') {
      handleUpdatePlan('entry')
      toast({ 
        title: "Payment Successful", 
        description: "Your $99 Monthly Entry Plan is now active.",
        className: "bg-emerald-50 border-emerald-200 text-emerald-900 font-black"
      })
    } else {
      toast({ 
        variant: "destructive",
        title: "Payment Failed", 
        description: "Transaction was declined by the bank." 
      })
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground uppercase tracking-tighter">Plan & Billing</h1>
        </div>
        <div className="flex items-center gap-6">
          <Button variant="ghost" className="rounded-xl h-10 font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground" onClick={() => router.push('/dashboard')}>
            Discard
          </Button>
          <Button onClick={() => toast({ title: "Invoicing Set", description: "Billing details saved." })} className="rounded-2xl h-11 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 px-8 shadow-xl shadow-primary/20 text-white text-[10px] gap-2">
            <Save className="w-4 h-4" />
            Save Billing
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-4xl mx-auto w-full space-y-12">
        <div className="space-y-2">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
            <CreditCard className="w-4 h-4" />
            Agency Subscription
          </h2>
          <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Manage your MediStay agency plan and payment history.</p>
        </div>

        <Card className="rounded-[3rem] border-2 border-primary bg-primary/5 shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity"><ShoppingBag className="w-48 h-48 text-primary" /></div>
          <CardContent className="p-12 flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
            <div className="space-y-6 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4">
                <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/30">
                  <CreditCard className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter">Stripe Entry Plan</h3>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Autonomous Retention Tier 1</p>
                </div>
              </div>
              <p className="text-sm font-black text-foreground leading-relaxed max-w-lg uppercase opacity-80 italic">
                The $99/mo plan (or $999/yr) provides full access to Module 1 (MARx Monitoring) and secure clinical GHL synchronization.
              </p>
            </div>
            <div className="text-center md:text-right space-y-6 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-border min-w-[280px]">
              <div className="flex items-baseline justify-center md:justify-end gap-1">
                <span className="text-5xl font-black text-foreground tracking-tighter">$99</span>
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">/MO</span>
              </div>
              
              <AlertDialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <AlertDialogTrigger asChild>
                  <Button className="w-full h-16 rounded-[1.25rem] bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-2xl shadow-primary/30 text-[10px] gap-2">
                    Launch Stripe Checkout <ExternalLink className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-2xl rounded-[3rem] p-0 overflow-hidden border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)]">
                  <div className="bg-[#635BFF] p-12 text-white flex flex-col items-center justify-center space-y-4">
                    <ShoppingBag className="w-12 h-12" />
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Stripe Checkout</h2>
                    <p className="text-sm font-black uppercase tracking-widest opacity-80">Secure BAA Payment Gateway</p>
                  </div>
                  <div className="p-12 space-y-10 bg-white">
                    <div className="flex justify-between items-center border-b border-border pb-8 text-foreground font-black uppercase tracking-widest text-xs">
                      <span>MediStay Entry Subscription</span>
                      <span className="text-lg">$99.00 / Month (or $999 / Year)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <Button variant="outline" className="h-16 rounded-2xl font-black uppercase border-2 border-border text-[10px] hover:bg-muted" onClick={() => handleStripeCheckout('decline')}>
                        Cancel
                      </Button>
                      <Button className="h-16 rounded-2xl bg-[#635BFF] hover:bg-[#534be5] text-white font-black uppercase text-[10px] shadow-xl shadow-[#635BFF]/30" onClick={() => handleStripeCheckout('confirm')}>
                        Authorize $99.00
                      </Button>
                    </div>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
