"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore, type BrokerAccount } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { 
  Settings, Building2, User, ShieldCheck, Bell, 
  Palette, Save, Lock, Users2, Plus, 
  MoreVertical, ShieldAlert, BadgeCheck,
  CreditCard, CheckCircle2, History, Download,
  ExternalLink, Fingerprint
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function SettingsContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("identity")
  
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
    toast({ title: "User Placeholder Added", description: "Edit the details in the team list below." })
  }

  const handleUpdatePlan = (plan: 'starter' | 'pro' | 'enterprise') => {
    updateAgencyProfile({ billingPlan: plan })
    toast({ title: "Plan Updated", description: `Agency successfully switched to the ${plan.toUpperCase()} tier.` })
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
        <Button onClick={handleSave} className="rounded-xl h-10 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 px-6 shadow-lg shadow-primary/20">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8 bg-background">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted p-1 rounded-2xl border shadow-sm mb-8 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="identity" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="w-4 h-4 mr-2" /> Identity
            </TabsTrigger>
            <TabsTrigger value="team" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users2 className="w-4 h-4 mr-2" /> Team
            </TabsTrigger>
            <TabsTrigger value="billing" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="w-4 h-4 mr-2" /> Billing
            </TabsTrigger>
            <TabsTrigger value="branding" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Palette className="w-4 h-4 mr-2" /> Branding
            </TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bell className="w-4 h-4 mr-2" /> Alerts
            </TabsTrigger>
            <TabsTrigger value="compliance" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShieldCheck className="w-4 h-4 mr-2" /> Compliance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identity" className="space-y-6 animate-in fade-in duration-300">
            <Card className="rounded-3xl border shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Management Mode
                </CardTitle>
                <CardDescription className="text-xs font-bold text-muted-foreground/80">
                  Configure whether you are operating as a solo broker or a full agency.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-6 rounded-2xl bg-muted/20 border border-border">
                  <div className="space-y-1">
                    <Label className="text-sm font-black text-foreground">Solo Broker Mode</Label>
                    <p className="text-[11px] text-muted-foreground font-bold leading-relaxed max-w-sm">
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
                      className="rounded-xl h-12 bg-background border-border/60 text-foreground font-black pl-4"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">License (NPN)</Label>
                    <Input 
                      value={agencyProfile.licenseNumber}
                      onChange={(e) => updateAgencyProfile({ licenseNumber: e.target.value })}
                      className="rounded-xl h-12 bg-background border-border/60 font-mono text-foreground font-black pl-4"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6 animate-in fade-in duration-300">
            <Card className="rounded-3xl border shadow-sm bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Users2 className="w-4 h-4 text-primary" />
                    Individualized Accounts
                  </CardTitle>
                  <CardDescription className="text-xs font-bold text-muted-foreground/80">Manage access levels and NPNs for your brokers.</CardDescription>
                </div>
                <Button onClick={handleAddUser} size="sm" className="rounded-xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white text-[10px] h-9 px-4">
                  <Plus className="w-4 h-4 mr-2" /> Add User
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-none">
                      <TableHead className="font-black text-[10px] uppercase px-8">Account</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">Role</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">NPN (Individual)</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">Status</TableHead>
                      <TableHead className="text-right px-8 font-black text-[10px] uppercase">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brokers.map((broker) => (
                      <TableRow key={broker.id} className="border-border/50">
                        <TableCell className="px-8 font-black text-sm">
                          <div className="flex flex-col">
                            <span className="uppercase tracking-tight">{broker.name}</span>
                            <span className="text-[10px] text-muted-foreground lowercase font-bold">{broker.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] uppercase font-black tracking-tighter border-border bg-muted/20">
                            {broker.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-[11px] font-black text-primary">{broker.npn || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase">Active</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 hover:bg-primary/5">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[
                { id: 'starter', name: 'Starter', price: '$499', features: ['Up to 500 Members', 'Module 1 & 2 Access', 'Basic CRM Sync'], desc: 'For independent brokers.' },
                { id: 'pro', name: 'Agency Pro', price: '$899', features: ['Unlimited Members', 'Full Module Suite (1-5)', 'Priority GHL Webhooks', 'Individualized NPN Splits'], desc: 'Our most popular agency plan.' },
                { id: 'enterprise', name: 'Enterprise', price: '$1,499', features: ['Custom Multi-Carrier Sync', 'White-Label Portals', 'Dedicated BAA Audit Support', 'API Access'], desc: 'For large multi-state agencies.' }
              ].map((plan) => (
                <Card key={plan.id} className={`rounded-3xl border-2 transition-all overflow-hidden flex flex-col ${agencyProfile.billingPlan === plan.id ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm font-black uppercase tracking-widest">{plan.name}</CardTitle>
                      {agencyProfile.billingPlan === plan.id && <Badge className="bg-primary text-white font-black uppercase text-[8px]">Current</Badge>}
                    </div>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-black">{plan.price}</span>
                      <span className="text-xs text-muted-foreground font-bold">/mo</span>
                    </div>
                    <CardDescription className="text-[10px] font-bold mt-2 leading-relaxed">{plan.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      onClick={() => handleUpdatePlan(plan.id as any)}
                      disabled={agencyProfile.billingPlan === plan.id}
                      className={`w-full rounded-xl text-[10px] font-black uppercase h-10 tracking-widest ${agencyProfile.billingPlan === plan.id ? 'bg-muted text-muted-foreground' : 'bg-primary hover:bg-primary/90'}`}
                    >
                      {agencyProfile.billingPlan === plan.id ? 'Plan Active' : 'Switch to ' + plan.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="rounded-3xl border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    BAA-Compliant Payment Vault
                  </CardTitle>
                  <CardDescription className="text-xs font-bold">Encrypted payment methods managed via BAA-signed processor.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-7 bg-slate-800 rounded flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase">Visa Ending in 4242</p>
                        <p className="text-[10px] text-muted-foreground font-bold">Expires 12/26</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[10px] font-black text-primary uppercase">Edit</Button>
                  </div>
                  <Button variant="outline" className="w-full rounded-xl border-dashed h-10 text-[10px] font-black uppercase tracking-widest">
                    <Plus className="w-3 h-3 mr-2" /> Add Backup Method
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border shadow-sm bg-card overflow-hidden">
                <CardHeader className="bg-muted/10 border-b">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    Billing History
                  </CardTitle>
                </CardHeader>
                <div className="divide-y">
                  {[
                    { date: 'Nov 01, 2024', amount: '$899.00', status: 'Paid', inv: 'INV-MS-99201' },
                    { date: 'Oct 01, 2024', amount: '$899.00', status: 'Paid', inv: 'INV-MS-99188' }
                  ].map((row, i) => (
                    <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50">
                      <div>
                        <p className="text-xs font-black">{row.date}</p>
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{row.inv}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-black">{row.amount}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => toast({ title: "Downloading Invoice", description: `Preparing HIPAA-compliant PDF for ${row.inv}...` })}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <Card className="rounded-3xl border shadow-sm bg-card p-8">
              <CardTitle className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                White-Label Customization
              </CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Primary Agency Color</Label>
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary shadow-inner border border-black/5" />
                    <Input className="font-mono text-xs font-black h-12 rounded-xl" value={agencyProfile.primaryColor} readOnly />
                  </div>
                </div>
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                  <p className="text-[11px] text-primary font-black uppercase tracking-widest">Branding Tip</p>
                  <p className="text-[11px] text-muted-foreground font-bold leading-relaxed italic">
                    "This color is used for member-facing PDF summaries, SSBCI cover sheets, and the broker dashboard accents."
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <Card className="rounded-3xl border shadow-sm bg-slate-900 text-white p-10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-10"><Lock className="w-32 h-32 text-white" /></div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 mb-8">
                <ShieldCheck className="w-5 h-5" /> HIPAA BAA Compliance Lock
              </CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Fingerprint className="w-3 h-3" /> Team MFA Enforced
                  </span>
                  <p className="text-[11px] text-slate-200 font-bold leading-relaxed">
                    Biometric or Token-based Multi-Factor Authentication is enforced for all individualized broker accounts.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <ShieldAlert className="w-3 h-3" /> Data Retention
                  </span>
                  <p className="text-[11px] text-slate-200 font-bold leading-relaxed">
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
      <Suspense fallback={<div className="flex-1 p-20 text-center font-black uppercase tracking-widest opacity-30">Loading Settings...</div>}>
        <SettingsContent />
      </Suspense>
    </div>
  )
}
