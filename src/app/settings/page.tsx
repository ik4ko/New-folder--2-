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
  Save, Lock, Users2, Plus, 
  MoreVertical, BadgeCheck,
  CreditCard,
  Fingerprint, ExternalLink as LinkIcon,
  ShoppingBag, ShieldAlert, Briefcase
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("identity")
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  
  const { agencyProfile, updateAgencyProfile, brokers, addBroker } = useAppStore()

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && ["identity", "branding", "alerts", "compliance", "team", "billing", "security", "carriers"].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (val: string) => {
    setActiveTab(val)
    router.push(`/settings?tab=${val}`)
  }

  const handleSave = () => {
    toast({ title: "Settings Saved", description: "Your agency preferences have been updated." })
  }

  const handleAddUser = () => {
    addBroker({ name: "New Associate", role: "broker", email: "", npn: "" })
    toast({ title: "Slot Created", description: "New broker placeholder added to team." })
  }

  const handleUpdatePlan = (plan: 'entry' | 'starter' | 'pro' | 'enterprise') => {
    updateAgencyProfile({ billingPlan: plan, isSubscriptionActive: true })
  }

  const handleStripeCheckout = (action: 'confirm' | 'decline') => {
    setIsCheckoutOpen(false)
    if (action === 'confirm') {
      handleUpdatePlan('entry')
      toast({ 
        title: "Payment Successful", 
        description: "Your $29 Monthly Entry Plan is now active.",
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
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-black text-foreground uppercase tracking-tight">
            {agencyProfile.isSolo ? "Broker Settings" : "Agency Settings"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="rounded-xl h-10 font-black uppercase text-[10px] tracking-widest text-muted-foreground" onClick={() => router.push('/dashboard')}>Discard</Button>
          <Button onClick={handleSave} className="rounded-xl h-10 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 px-6 shadow-lg shadow-primary/20 text-white text-[10px]">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8 bg-background">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="bg-muted p-1 rounded-2xl border border-border mb-8 flex flex-wrap h-auto gap-1 shadow-inner">
            <TabsTrigger value="identity" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-2" /> Identity
            </TabsTrigger>
            <TabsTrigger value="team" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users2 className="w-4 h-4 mr-2" /> Team
            </TabsTrigger>
            <TabsTrigger value="carriers" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
              <Briefcase className="w-4 h-4 mr-2" /> Carriers
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
              <ShieldAlert className="w-4 h-4 mr-2" /> Security
            </TabsTrigger>
            <TabsTrigger value="billing" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
              <CreditCard className="w-4 h-4 mr-2" /> Billing
            </TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
              <Bell className="w-4 h-4 mr-2" /> Alerts
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
                  Configure your agency operational structure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-6 rounded-2xl bg-muted/20 border border-border">
                  <div className="space-y-1">
                    <Label className="text-sm font-black text-foreground uppercase">Solo Broker Mode</Label>
                    <p className="text-[11px] text-muted-foreground font-black leading-relaxed max-w-sm uppercase opacity-60">
                      Optimized for independent agents. Removes team management UI modules.
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
                    <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">Agency NPN</Label>
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

          <TabsContent value="carriers" className="space-y-6 animate-in fade-in duration-300">
            <Card className="rounded-3xl border border-border shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Contracted Carriers & Licensing
                </CardTitle>
                <CardDescription className="text-xs font-black uppercase opacity-60">Manage your state appointments and carrier ID numbers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { carrier: "UnitedHealthcare", states: "CA, TX, FL", writingId: "UHC-99201" },
                    { carrier: "Humana", states: "CA, NV", writingId: "HUM-7721" },
                    { carrier: "Clover Health", states: "CA", writingId: "CLV-0012" }
                  ].map((contract, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border bg-muted/10">
                      <div>
                        <p className="text-[11px] font-black uppercase text-foreground">{contract.carrier}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Active in: {contract.states}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-mono font-black text-primary">{contract.writingId}</p>
                        <p className="text-[8px] font-bold text-emerald-600 uppercase">Contract Verified</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full rounded-xl border-dashed border-2 h-12 text-[10px] font-black uppercase tracking-widest">
                  <Plus className="w-4 h-4 mr-2" /> Add New Carrier Appointment
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6 animate-in fade-in duration-300">
            <Card className="rounded-3xl border border-border shadow-sm bg-slate-950 text-white p-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-10"><Lock className="w-32 h-32 text-white" /></div>
              <CardHeader className="px-0">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                  <Fingerprint className="w-5 h-5" />
                  HIPAA Access Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 space-y-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Enforce 2FA</Label>
                      <Switch defaultChecked />
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">Required for all agency roles to access PHI.</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-300">IP Whitelisting</Label>
                      <Switch />
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">Restrict access to specific office network IPs.</p>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Audit Retention: 10 Years</span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-medium uppercase opacity-80 leading-relaxed">
                    MediStay automatically archives all member record modifications and MARx polling data for the federally mandated period.
                  </p>
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
                    Individualized Broker Splits
                  </CardTitle>
                  <CardDescription className="text-xs font-black uppercase opacity-60">Manage permissions and NPNs for your roster.</CardDescription>
                </div>
                <Button onClick={handleAddUser} size="sm" className="rounded-xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white text-[10px] h-9 px-4">
                  <Plus className="w-4 h-4 mr-2" /> Add Broker
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-none">
                      <TableHead className="font-black text-[10px] uppercase px-8 text-foreground">Broker Account</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-foreground">Designation</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-foreground">NPN (Licensed)</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-foreground">MARx Sync</TableHead>
                      <TableHead className="text-right px-8 font-black text-[10px] uppercase text-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brokers.map((broker) => (
                      <TableRow key={broker.id} className="border-border/50">
                        <TableCell className="px-8 font-black text-sm text-foreground">
                          <div className="flex flex-col">
                            <span className="uppercase tracking-tight">{broker.name}</span>
                            <span className="text-[10px] text-muted-foreground lowercase font-black italic">{broker.email || 'pending@agency.com'}</span>
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
                      <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Stripe Monthly Plan</h3>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Autonomous Retention Entry</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-foreground leading-relaxed max-w-lg uppercase opacity-80">
                    The $29/mo plan provides full access to Module 1 (MARx Monitoring) and secure clinical GHL synchronization.
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
                        Launch Stripe Checkout <LinkIcon className="ml-2 w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                      <div className="bg-[#635BFF] p-8 text-white flex flex-col items-center justify-center space-y-4">
                        <ShoppingBag className="w-10 h-10" />
                        <h2 className="text-2xl font-black uppercase tracking-tight">Stripe Checkout</h2>
                        <p className="text-sm font-black uppercase opacity-80">Secure BAA Payment Portal</p>
                      </div>
                      <div className="p-10 space-y-8 bg-white">
                        <div className="flex justify-between items-center border-b border-border pb-6 text-foreground font-black uppercase tracking-widest text-xs">
                          <span>MediStay Entry Subscription</span>
                          <span>$29.00 / Month</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Button variant="outline" className="h-14 rounded-2xl font-black uppercase border-2 border-border text-[10px]" onClick={() => handleStripeCheckout('decline')}>
                            Cancel
                          </Button>
                          <Button className="h-14 rounded-2xl bg-[#635BFF] hover:bg-[#534be5] text-white font-black uppercase text-[10px]" onClick={() => handleStripeCheckout('confirm')}>
                            Authorize $29.00
                          </Button>
                        </div>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card className="rounded-3xl border border-border shadow-sm bg-card p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Bell className="w-6 h-6 text-primary" />
                  <h2 className="text-lg font-black uppercase tracking-tight text-foreground">Real-Time Sync Alerts</h2>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { title: "MARx Switch Detection", desc: "SMS alert upon detection of a carrier disenrollment event." },
                  { title: "Daily CRM Snapshot", desc: "Overnight summary of all updated GoHighLevel contact records." },
                  { title: "Spruce Fax Confirmation", desc: "Push notification when a provider confirms chronic condition verification." }
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
        </Tabs>
      </div>
    </div>
  )
}

export default function AgencySettingsPage() {
  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      <Suspense fallback={<div className="flex-1 p-20 text-center font-black uppercase tracking-widest opacity-30 text-foreground">Initializing HIPAA Workspace...</div>}>
        <SettingsContent />
      </Suspense>
    </div>
  )
}
