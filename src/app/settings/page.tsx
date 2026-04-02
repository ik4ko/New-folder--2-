"use client"

import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Building2, Save, Lock, Users2, Plus, 
  MoreVertical, CreditCard,
  ExternalLink as LinkIcon,
  ShoppingBag, ShieldAlert, Briefcase, Mic2,
  PanelLeftClose, Bell, ShieldCheck, Globe
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

function SettingsSidebar({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) {
  const { isSidebarOpen, toggleSidebar } = useAppStore()

  const menuItems = [
    { id: "identity", label: "Agency Identity", icon: Building2 },
    { id: "team", label: "Team & Splits", icon: Users2 },
    { id: "maya", label: "Maya AI Voice", icon: Mic2 },
    { id: "carriers", label: "Carrier Contracts", icon: Briefcase },
    { id: "alerts", label: "Sync Alerts", icon: Bell },
    { id: "security", label: "HIPAA Security", icon: ShieldAlert },
    { id: "billing", label: "Plan & Billing", icon: CreditCard },
    { id: "compliance", label: "Compliance Logs", icon: ShieldCheck },
  ]

  return (
    <aside className={cn(
      "flex flex-col h-full bg-background border-r border-border shrink-0 z-40 overflow-hidden transition-all duration-300 ease-in-out",
      isSidebarOpen ? "w-64 opacity-100" : "w-0 opacity-0 border-none pointer-events-none"
    )}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap px-2">
          Agency Settings
        </h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar} 
          className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group relative cursor-pointer",
                activeTab === item.id 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-black" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", activeTab === item.id ? "text-white" : "text-muted-foreground/60 group-hover:text-primary")} />
              <span className="text-[10px] font-black uppercase tracking-widest truncate">{item.label}</span>
              {activeTab === item.id && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-muted/5 shrink-0">
        <div className="p-2.5 rounded-xl border border-border bg-card/50 text-center">
          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-50">
            MediStay Workspace v4.2
          </p>
        </div>
      </div>
    </aside>
  )
}

function SettingsContent({ activeTab }: { activeTab: string }) {
  const router = useRouter()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  
  const { agencyProfile, updateAgencyProfile, brokers, addBroker, mayaSettings, updateMayaSettings } = useAppStore()

  const handleSave = () => {
    toast({ title: "Settings Saved", description: "Your agency configuration has been updated across all nodes." })
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
      <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground uppercase tracking-tighter">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Configuration
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <Button variant="ghost" className="rounded-xl h-10 font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-foreground" onClick={() => router.push('/dashboard')}>
            Discard
          </Button>
          <Button onClick={handleSave} className="rounded-2xl h-11 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 px-8 shadow-xl shadow-primary/20 text-white text-[10px] gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12 max-w-5xl mx-auto w-full space-y-12">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="identity" className="space-y-10 m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                <Building2 className="w-4 h-4" />
                Management Mode
              </h2>
              <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Configure your agency operational structure.</p>
            </div>

            <Card className="rounded-[2.5rem] border border-border shadow-sm bg-card overflow-hidden">
              <CardContent className="p-10 space-y-10">
                <div className="flex items-center justify-between p-8 rounded-3xl bg-muted/20 border border-border">
                  <div className="space-y-1">
                    <Label className="text-sm font-black text-foreground uppercase">Solo Broker Mode</Label>
                    <p className="text-[11px] text-muted-foreground font-bold leading-relaxed max-w-sm uppercase opacity-60">
                      Optimized for independent agents. Removes team management UI modules and split tracking.
                    </p>
                  </div>
                  <Switch 
                    checked={agencyProfile.isSolo} 
                    onCheckedChange={(val) => updateAgencyProfile({ isSolo: val })} 
                  />
                </div>

                <div className="flex flex-col gap-10 max-w-md">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {agencyProfile.isSolo ? "Broker Name" : "Agency Name"}
                    </Label>
                    <Input 
                      value={agencyProfile.name}
                      onChange={(e) => updateAgencyProfile({ name: e.target.value })}
                      className="rounded-2xl h-14 bg-background border-border text-foreground font-black pl-6 shadow-inner uppercase text-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Agency NPN (Licensed)</Label>
                    <Input 
                      value={agencyProfile.licenseNumber}
                      onChange={(e) => updateAgencyProfile({ licenseNumber: e.target.value })}
                      className="rounded-2xl h-14 bg-background border-border font-mono text-foreground font-black pl-6 shadow-inner text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maya" className="space-y-10 m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                <Mic2 className="w-4 h-4" />
                Maya AI Configuration
              </h2>
              <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Fine-tune Maya's outbound clinical personality.</p>
            </div>

            <Card className="rounded-[2.5rem] border border-border shadow-sm bg-card">
              <CardContent className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Active Voice Profile</Label>
                    <div className="flex gap-3">
                      <Button 
                        variant={mayaSettings.voiceName === 'Algenib' ? 'default' : 'outline'} 
                        className="flex-1 rounded-2xl h-14 font-black uppercase text-[10px]"
                        onClick={() => updateMayaSettings({ voiceName: 'Algenib' })}
                      >
                        Algenib (Female)
                      </Button>
                      <Button 
                        variant={mayaSettings.voiceName === 'Achernar' ? 'default' : 'outline'} 
                        className="flex-1 rounded-2xl h-14 font-black uppercase text-[10px]"
                        onClick={() => updateMayaSettings({ voiceName: 'Achernar' })}
                      >
                        Achernar (Male)
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Auto-Escalation</Label>
                      <Switch 
                        checked={mayaSettings.autoEscalate}
                        onCheckedChange={(val) => updateMayaSettings({ autoEscalate: val })}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-black uppercase leading-relaxed opacity-60">Maya will instantly alert a broker if disenrollment keywords are detected during check-ins.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Global Retention Script</Label>
                  <Textarea 
                    value={mayaSettings.script}
                    onChange={(e) => updateMayaSettings({ script: e.target.value })}
                    className="min-h-[200px] rounded-3xl bg-muted/20 border-border p-6 text-sm font-medium leading-relaxed italic"
                  />
                  <div className="flex justify-center gap-4">
                    {['{member_name}', '{carrier}', '{days_enrolled}'].map(token => (
                      <Badge key={token} variant="outline" className="text-[9px] font-black uppercase bg-primary/5 text-primary border-primary/20">{token}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="carriers" className="space-y-10 m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                <Briefcase className="w-4 h-4" />
                Carrier Appointments
              </h2>
              <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Manage your state appointments and carrier ID numbers.</p>
            </div>

            <Card className="rounded-[2.5rem] border border-border shadow-sm bg-card overflow-hidden">
              <CardContent className="p-10 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { carrier: "UnitedHealthcare", states: "CA, TX, FL", writingId: "UHC-99201" },
                    { carrier: "Humana", states: "CA, NV", writingId: "HUM-7721" },
                    { carrier: "Clover Health", states: "CA", writingId: "CLV-0012" }
                  ].map((contract, i) => (
                    <div key={i} className="flex items-center justify-between p-6 rounded-3xl border bg-muted/10 group hover:bg-muted/20 transition-all">
                      <div>
                        <p className="text-sm font-black uppercase text-foreground">{contract.carrier}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Active in: {contract.states}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-black text-primary">{contract.writingId}</p>
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Verified Contract</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full rounded-2xl border-dashed border-2 h-14 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 transition-all">
                  <Plus className="w-4 h-4 mr-2" /> Add New Carrier Appointment
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-10 m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-emerald-600">
                <ShieldAlert className="w-4 h-4" />
                HIPAA Security Protocols
              </h2>
              <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Enforce enterprise-grade data protection.</p>
            </div>

            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-slate-950 text-white p-10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-10 opacity-5"><Lock className="w-48 h-48 text-white" /></div>
              <CardContent className="px-0 space-y-10 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Enforce 2FA</Label>
                      <Switch defaultChecked />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed opacity-70">Mandatory for all agency roles accessing PHI datasets.</p>
                  </div>
                  <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-300">IP Whitelisting</Label>
                      <Switch />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed opacity-70">Restrict workspace access to verified agency office networks.</p>
                  </div>
                </div>
                <div className="p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Audit Retention Active: 10 Years</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-bold uppercase opacity-80 leading-relaxed">
                    MediStay automatically logs all member record modifications and HETS polling data. Records are cryptographically signed and stored in a federal-grade archive.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-10 m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                <Users2 className="w-4 h-4" />
                Team & Individual Splits
              </h2>
              <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Manage permissions and NPNs for your roster.</p>
            </div>

            <Card className="rounded-[2.5rem] border border-border shadow-sm bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 p-8">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-tight">Active Producers</CardTitle>
                </div>
                {!agencyProfile.isSolo && (
                  <Button onClick={handleAddUser} size="sm" className="rounded-2xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white text-[10px] h-11 px-6 shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4 mr-2" /> Add Broker
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 border-none">
                      <TableHead className="font-black text-[10px] uppercase px-10 text-foreground h-14">Broker Account</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-foreground">Designation</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-foreground">NPN (Licensed)</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-foreground text-right px-10">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brokers.map((broker) => (
                      <TableRow key={broker.id} className="border-border/50 hover:bg-muted/20 transition-colors">
                        <TableCell className="px-10 py-6 font-black text-sm text-foreground">
                          <div className="flex flex-col">
                            <span className="uppercase tracking-tight">{broker.name}</span>
                            <span className="text-[10px] text-muted-foreground lowercase font-black italic opacity-60">{broker.email || 'pending@agency.com'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest border-border bg-white text-foreground px-3">
                            {broker.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-black text-primary">{broker.npn || '00000000'}</TableCell>
                        <TableCell className="text-right px-10">
                          <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 hover:bg-primary/5">
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

          <TabsContent value="billing" className="space-y-10 m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                <CreditCard className="w-4 h-4" />
                Subscription & Billing
              </h2>
              <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Manage your MediStay agency plan.</p>
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
                    The $29/mo plan provides full access to Module 1 (MARx Monitoring) and secure clinical GHL synchronization for up to 100 members.
                  </p>
                </div>
                <div className="text-center md:text-right space-y-6 bg-white p-10 rounded-[2.5rem] shadow-2xl border border-border min-w-[280px]">
                  <div className="flex items-baseline justify-center md:justify-end gap-1">
                    <span className="text-5xl font-black text-foreground tracking-tighter">$29</span>
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">/MO</span>
                  </div>
                  
                  <AlertDialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full h-16 rounded-[1.25rem] bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-2xl shadow-primary/30 text-[10px] gap-2">
                        Launch Stripe Checkout <LinkIcon className="w-4 h-4" />
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
                          <span className="text-lg">$29.00 / Month</span>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <Button variant="outline" className="h-16 rounded-2xl font-black uppercase border-2 border-border text-[10px] hover:bg-muted" onClick={() => handleStripeCheckout('decline')}>
                            Cancel
                          </Button>
                          <Button className="h-16 rounded-2xl bg-[#635BFF] hover:bg-[#534be5] text-white font-black uppercase text-[10px] shadow-xl shadow-[#635BFF]/30" onClick={() => handleStripeCheckout('confirm')}>
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

          <TabsContent value="alerts" className="space-y-10 m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                <Bell className="w-4 h-4" />
                Sync Notifications
              </h2>
              <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Manage real-time agency alerts.</p>
            </div>

            <Card className="rounded-[2.5rem] border border-border shadow-sm bg-card p-10">
              <div className="grid grid-cols-1 gap-6">
                {[
                  { title: "MARx Switch Detection", desc: "Push & SMS alert upon detection of a carrier disenrollment event." },
                  { title: "Daily CRM Snapshot", desc: "Overnight summary of all updated GoHighLevel contact records." },
                  { title: "Spruce Fax Confirmation", desc: "Alert when a provider confirms chronic condition verification." }
                ].map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-8 rounded-3xl bg-muted/20 border border-border hover:bg-muted/30 transition-all">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-foreground uppercase tracking-tight">{alert.title}</p>
                      <p className="text-[11px] text-muted-foreground font-black uppercase opacity-60 italic">{alert.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-10 m-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                <ShieldCheck className="w-4 h-4" />
                Audit Logs & Compliance
              </h2>
              <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Review federal record retention status.</p>
            </div>

            <Card className="rounded-[2.5rem] border border-border shadow-sm bg-card overflow-hidden">
              <CardContent className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="p-8 rounded-3xl bg-background border border-border space-y-4 shadow-inner">
                    <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      Data Residency
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed uppercase font-black opacity-70 italic">
                      All member PHI is isolated in US-East-1 (HIPAA Compliant AWS Cluster).
                    </p>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[9px] px-3">LOCKED</Badge>
                  </div>
                  <div className="p-8 rounded-3xl bg-background border border-border space-y-4 shadow-inner">
                    <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <Save className="w-4 h-4 text-primary" />
                      Retention Lifecycle
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed uppercase font-black opacity-70 italic">
                      CMS requirement: 10 Year Archive active for all SOA and enrollment logs.
                    </p>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[9px] px-3">ACTIVE</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full rounded-2xl h-14 border-primary/20 text-primary font-black uppercase text-[10px] tracking-[0.2em] shadow-sm hover:bg-primary/5">
                  Download Annual Compliance Inventory
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function AgencySettingsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get("tab") || "identity"
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab")
    if (tabFromUrl) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.push(`/settings?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="flex h-full w-full">
      <SettingsSidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <SettingsContent activeTab={activeTab} />
    </div>
  )
}

export default function AgencySettingsPage() {
  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <Suspense fallback={<div className="flex-1 p-20 text-center font-black uppercase tracking-widest opacity-30 text-foreground animate-pulse">Initializing HIPAA Workspace...</div>}>
        <AgencySettingsPageInner />
      </Suspense>
    </div>
  )
}
