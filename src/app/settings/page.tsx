"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { 
  Settings, Building2, User, ShieldCheck, Bell, 
  Palette, Save, Lock, Users2, Plus, 
  MoreVertical, BadgeCheck,
  CreditCard, History,
  Fingerprint, ExternalLink as LinkIcon,
  ShoppingBag
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"

function SettingsContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("identity")
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  
  const { agencyProfile, updateAgencyProfile, brokers, addBroker } = useAppStore()

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && ["identity", "branding", "alerts", "compliance", "team", "billing"].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleSave = () => {
    toast({ title: "Settings Saved", description: "Your preferences have been updated and synced locally." })
  }

  const handleAddUser = () => {
    addBroker({ name: "New Broker", role: "broker", email: "", npn: "" })
    toast({ title: "User Added", description: "New broker placeholder created." })
  }

  const handleUpdatePlan = (plan: 'entry' | 'starter' | 'pro' | 'enterprise') => {
    updateAgencyProfile({ billingPlan: plan, isSubscriptionActive: true })
    toast({ title: "Plan Updated", description: `Agency switched to ${plan.toUpperCase()} tier.` })
  }

  const handleStripeCheckout = (action: 'confirm' | 'decline') => {
    setIsCheckoutOpen(false)
    if (action === 'confirm') {
      handleUpdatePlan('entry')
      toast({ 
        title: "Payment Successful", 
        description: "Your $29 Entry Plan is now active.",
        className: "bg-emerald-50 border-emerald-200 text-emerald-900 font-black"
      })
    } else {
      toast({ 
        variant: "destructive",
        title: "Payment Cancelled", 
        description: "Payment session declined." 
      })
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-black text-foreground uppercase tracking-tight">
            {agencyProfile.isSolo ? "Broker Settings" : "Agency Settings"}
          </h1>
        </div>
        <Button onClick={handleSave} className="rounded-xl h-10 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 px-6 shadow-lg shadow-primary/20 text-white text-[10px]">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8 bg-background">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted p-1 rounded-2xl border border-border mb-8 flex flex-wrap h-auto gap-1 shadow-inner">
            <TabsTrigger value="identity" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-2" /> Identity
            </TabsTrigger>
            <TabsTrigger value="team" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users2 className="w-4 h-4 mr-2" /> Team
            </TabsTrigger>
            <TabsTrigger value="billing" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
              <CreditCard className="w-4 h-4 mr-2" /> Billing
            </TabsTrigger>
            <TabsTrigger value="branding" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
              <Palette className="w-4 h-4 mr-2" /> Branding
            </TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
              <Bell className="w-4 h-4 mr-2" /> Alerts
            </TabsTrigger>
            <TabsTrigger value="compliance" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
              <ShieldCheck className="w-4 h-4 mr-2" /> Compliance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identity" className="space-y-6 animate-in fade-in duration-300">
            <Card className="rounded-3xl border border-border shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Management Mode
                </CardTitle>
                <CardDescription className="text-xs font-black text-muted-foreground uppercase opacity-70">
                  Configure whether you are operating as a solo broker or a full agency.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-6 rounded-2xl bg-muted/20 border border-border">
                  <div className="space-y-1">
                    <Label className="text-sm font-black text-foreground uppercase">Solo Broker Mode</Label>
                    <p className="text-[11px] text-muted-foreground font-black leading-relaxed max-w-sm uppercase opacity-60">
                      Optimized for individual agents with no subordinates. Removes team management UI.
                    </p>
                  </div>
                  <Switch 
                    checked={agencyProfile.isSolo} 
                    onCheckedChange={(val) => updateAgencyProfile({ isSolo: val })} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">
                      {agencyProfile.isSolo ? "Broker Name" : "Agency Name"}
                    </Label>
                    <Input 
                      value={agencyProfile.name}
                      onChange={(e) => updateAgencyProfile({ name: e.target.value })}
                      className="rounded-xl h-12 bg-background border-border text-foreground font-black pl-4 shadow-inner uppercase"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">License (NPN)</Label>
                    <Input 
                      value={agencyProfile.licenseNumber}
                      onChange={(e) => updateAgencyProfile({ licenseNumber: e.target.value })}
                      className="rounded-xl h-12 bg-background border-border font-mono text-foreground font-black pl-4 shadow-inner"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6 animate-in fade-in duration-300">
            <Card className="rounded-3xl border border-border shadow-sm bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-4">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Users2 className="w-4 h-4 text-primary" />
                    Individualized Accounts
                  </CardTitle>
                  <CardDescription className="text-xs font-black uppercase opacity-60">Manage access levels and NPNs for your brokers.</CardDescription>
                </div>
                <Button onClick={handleAddUser} size="sm" className="rounded-xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white text-[10px] h-9 px-4">
                  <Plus className="w-4 h-4 mr-2" /> Add User
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-none">
                      <TableHead className="font-black text-[10px] uppercase px-8 text-foreground">Account</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-foreground">Role</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-foreground">NPN (Individual)</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-foreground">Status</TableHead>
                      <TableHead className="text-right px-8 font-black text-[10px] uppercase text-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brokers.map((broker) => (
                      <TableRow key={broker.id} className="border-border/50">
                        <TableCell className="px-8 font-black text-sm text-foreground">
                          <div className="flex flex-col">
                            <span className="uppercase tracking-tight">{broker.name}</span>
                            <span className="text-[10px] text-muted-foreground lowercase font-black italic">{broker.email || 'no-email@agency.com'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] uppercase font-black tracking-tighter border-border bg-white text-foreground">
                            {broker.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-[11px] font-black text-primary">{broker.npn || '00000000'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-emerald-700">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase">Active</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 hover:bg-primary/5">
                            <MoreVertical className="w-4 h-4 text-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-8 animate-in fade-in duration-300">
            <Card className="rounded-3xl border-2 border-primary bg-primary/5 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10"><ShoppingBag className="w-32 h-32 text-primary" /></div>
              <CardContent className="p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                <div className="space-y-4 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Stripe Entry Plan</h3>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Entry-Level Member Protection</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-foreground leading-relaxed max-w-lg uppercase opacity-80">
                    Perfect for new independent brokers. Get full access to Module 1 (MARx Monitoring) and basic CRM sync.
                  </p>
                </div>
                <div className="text-center md:text-right space-y-4 bg-white p-8 rounded-3xl shadow-lg border border-border min-w-[240px]">
                  <div className="flex items-baseline justify-center md:justify-end gap-1">
                    <span className="text-4xl font-black text-foreground">$29</span>
                    <span className="text-xs font-black text-muted-foreground uppercase">/mo</span>
                  </div>
                  
                  <AlertDialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 text-[10px]">
                        Stripe Checkout <LinkIcon className="ml-2 w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                      <div className="bg-[#635BFF] p-8 text-white flex flex-col items-center justify-center space-y-4">
                        <ShoppingBag className="w-10 h-10" />
                        <h2 className="text-2xl font-black uppercase tracking-tight">Stripe Checkout</h2>
                        <p className="text-sm font-black uppercase opacity-80">Payment for MediStay Entry Plan</p>
                      </div>
                      <div className="p-10 space-y-8 bg-white">
                        <div className="flex justify-between items-center border-b border-border pb-6 text-foreground font-black uppercase tracking-widest text-xs">
                          <span>Order Total</span>
                          <span>$29.00</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Button variant="outline" className="h-14 rounded-2xl font-black uppercase border-2 border-border text-[10px]" onClick={() => handleStripeCheckout('decline')}>
                            Cancel
                          </Button>
                          <Button className="h-14 rounded-2xl bg-[#635BFF] hover:bg-[#534be5] text-white font-black uppercase text-[10px]" onClick={() => handleStripeCheckout('confirm')}>
                            Pay $29.00
                          </Button>
                        </div>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <Card className="rounded-3xl border border-border shadow-sm bg-card p-10">
              <div className="flex items-center gap-4 mb-8">
                <Palette className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-black uppercase tracking-tight text-foreground">White-Label Branding</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-foreground">Primary Theme Color</Label>
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary shadow-inner border border-black/10" />
                    <Input className="font-mono text-xs font-black h-12 rounded-xl bg-background border-border text-foreground pl-4" value={agencyProfile.primaryColor} readOnly />
                  </div>
                </div>
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-2 text-[11px] text-foreground font-black leading-relaxed italic uppercase opacity-70">
                  "This color is used for member-facing PDF summaries, SSBCI cover sheets, and the broker dashboard accents."
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card className="rounded-3xl border border-border shadow-sm bg-card p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Bell className="w-6 h-6 text-primary" />
                  <h2 className="text-lg font-black uppercase tracking-tight text-foreground">Real-Time Alerts</h2>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { title: "Critical Churn Detection", desc: "SMS alert when MARx snapshot detects carrier switch." },
                  { title: "Daily Sync Summary", desc: "Email summary of overnight CRM and CMS polls." },
                  { title: "Compliance Expiry", desc: "Nudge when SOAs are approaching the 10-year limit." }
                ].map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-muted/20 border border-border">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-foreground uppercase tracking-tight">{alert.title}</p>
                      <p className="text-[11px] text-muted-foreground font-black uppercase opacity-60">{alert.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <Card className="rounded-3xl border border-border shadow-sm bg-slate-900 text-white p-10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-10"><Lock className="w-32 h-32 text-white" /></div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 mb-8 underline decoration-emerald-400/30 underline-offset-8">
                <ShieldCheck className="w-5 h-5" /> HIPAA BAA Compliance Lock
              </CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Fingerprint className="w-3 h-3" /> Team MFA Enforced
                  </span>
                  <p className="text-[11px] text-slate-200 font-black uppercase leading-relaxed opacity-80">
                    Biometric or Token-based Multi-Factor Authentication is enforced for all individualized broker accounts.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <History className="w-3 h-3" /> Data Retention
                  </span>
                  <p className="text-[11px] text-slate-200 font-black uppercase leading-relaxed opacity-80">
                    Member data and call recordings are retained for the HIPAA-required period of 6-10 years.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function AgencySettingsPage() {
  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      <Suspense fallback={<div className="flex-1 p-20 text-center font-black uppercase tracking-widest opacity-30 text-foreground">Loading Settings...</div>}>
        <SettingsContent />
      </Suspense>
    </div>
  )
}