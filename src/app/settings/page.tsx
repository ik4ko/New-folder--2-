
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
  Palette, Smartphone, Mail, Globe, Save, 
  Briefcase, Fingerprint, Lock
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"

export default function AgencySettingsPage() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "identity"
  const [activeTab, setActiveTab] = useState(defaultTab)
  
  const agencyProfile = useAppStore(s => s.agencyProfile)
  const updateAgencyProfile = useAppStore(s => s.updateAgencyProfile)

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab) setActiveTab(tab)
  }, [searchParams])

  const handleSave = () => {
    toast({ title: "Settings Saved", description: "Your preferences have been updated and synced locally." })
  }

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              {agencyProfile.isSolo ? "Broker Settings" : "Agency Settings"}
            </h1>
          </div>
          <Button onClick={handleSave} className="rounded-xl h-10 font-bold bg-primary hover:bg-primary/90 px-6 shadow-lg shadow-primary/20">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8 bg-[#F7F4F0]/30 dark:bg-background">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white dark:bg-card p-1 rounded-2xl border shadow-sm mb-8 flex flex-wrap h-auto gap-1">
              <TabsTrigger value="identity" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Building2 className="w-4 h-4 mr-2" />
                Identity
              </TabsTrigger>
              <TabsTrigger value="branding" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Palette className="w-4 h-4 mr-2" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="alerts" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bell className="w-4 h-4 mr-2" />
                Alerts
              </TabsTrigger>
              <TabsTrigger value="compliance" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Compliance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-6 animate-in fade-in duration-300">
              <Card className="rounded-3xl border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Management Mode
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure whether you are operating as a solo broker or a full agency.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Solo Broker Mode</Label>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Optimized for individual agents with no subordinates. Removes team management UI.
                      </p>
                    </div>
                    <Switch 
                      checked={agencyProfile.isSolo} 
                      onCheckedChange={(val) => updateAgencyProfile({ isSolo: val })} 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        {agencyProfile.isSolo ? "Broker Name" : "Agency Name"}
                      </Label>
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
                        <Input 
                          value={agencyProfile.name}
                          onChange={(e) => updateAgencyProfile({ name: e.target.value })}
                          className="rounded-xl pl-11 h-12 bg-white shadow-inner"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">License (NPN)</Label>
                      <div className="relative group">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
                        <Input 
                          value={agencyProfile.licenseNumber}
                          onChange={(e) => updateAgencyProfile({ licenseNumber: e.target.value })}
                          className="rounded-xl pl-11 h-12 bg-white shadow-inner font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Public Phone</Label>
                      <div className="relative group">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
                        <Input 
                          value={agencyProfile.phone}
                          onChange={(e) => updateAgencyProfile({ phone: e.target.value })}
                          className="rounded-xl pl-11 h-12 bg-white shadow-inner"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Admin Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
                        <Input 
                          value={agencyProfile.email}
                          onChange={(e) => updateAgencyProfile({ email: e.target.value })}
                          className="rounded-xl pl-11 h-12 bg-white shadow-inner"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding" className="space-y-6 animate-in fade-in duration-300">
              <Card className="rounded-3xl border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    White-Label Customization
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Customize the appearance of member notifications and the benefits summary mailers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                      <Label className="text-xs font-bold">Primary Branding Color</Label>
                      <div className="flex gap-4">
                        <div 
                          className="w-16 h-16 rounded-2xl border-4 border-white shadow-xl shrink-0" 
                          style={{ backgroundColor: agencyProfile.primaryColor || '#B08627' }}
                        />
                        <div className="flex-1 space-y-2">
                          <Input 
                            type="text" 
                            placeholder="#B08627" 
                            className="h-10 rounded-xl font-mono text-xs" 
                            value={agencyProfile.primaryColor}
                            onChange={(e) => updateAgencyProfile({ primaryColor: e.target.value })}
                          />
                          <p className="text-[9px] text-muted-foreground">Used for PDF headers and button highlights.</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-xs font-bold">Agency Logo (High Res)</Label>
                      <div className="border-2 border-dashed border-muted rounded-2xl p-6 flex flex-col items-center justify-center gap-2 bg-muted/5 cursor-pointer hover:bg-muted/10 transition-all">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                          <Globe className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-primary">Upload SVG or PNG</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-6 animate-in fade-in duration-300">
              <Card className="rounded-3xl border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    Global Alert Routing
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure how and when your team receives automated retention notifications.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Module 1: CMS Switch SMS", desc: "Text the owner/broker the second a switch is detected." },
                    { label: "Module 2: Call Escalation Email", desc: "Send admin email if Maya AI detects dissatisfaction." },
                    { label: "Module 3: Chronic Fax Confirmation", desc: "Notify when physician returns signed SSBCI form." },
                    { label: "Daily Retention Summary", desc: "Morning briefing email with at-risk member counts." }
                  ].map((notif, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border bg-white dark:bg-slate-900/50">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold">{notif.label}</Label>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">{notif.desc}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-6 animate-in fade-in duration-300">
              <Card className="rounded-3xl border shadow-sm bg-slate-900 text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Lock className="w-24 h-24" />
                </div>
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Security & BAA Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AWS Bedrock BAA</span>
                        <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[8px] font-bold">SIGNED</div>
                      </div>
                      <p className="text-[9px] text-slate-300 leading-relaxed">
                        Covers all Claude 3.5 Sonnet processing of PHI data.
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">MFA Status</span>
                        <div className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[8px] font-bold">REQUIRED</div>
                      </div>
                      <p className="text-[9px] text-slate-300 leading-relaxed">
                        Agency-wide biometric MFA is enforced for all broker logins.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-white/10">
                    <div className="flex items-center gap-3">
                      <Fingerprint className="w-5 h-5 text-primary" />
                      <span className="text-xs font-bold">Agency Encryption Key:</span>
                      <code className="text-[10px] bg-white/10 px-2 py-1 rounded font-mono">MS-AES-256-***-B9</code>
                    </div>
                    <Button variant="link" className="text-xs text-slate-400 hover:text-white">Review Audit History</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
