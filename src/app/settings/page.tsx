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
            <h1 className="text-xl font-black text-foreground">
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
              <TabsTrigger value="identity" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Building2 className="w-4 h-4 mr-2" />
                Identity
              </TabsTrigger>
              <TabsTrigger value="branding" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Palette className="w-4 h-4 mr-2" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="alerts" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Bell className="w-4 h-4 mr-2" />
                Alerts
              </TabsTrigger>
              <TabsTrigger value="compliance" className="rounded-xl flex-1 min-w-[120px] py-2.5 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Compliance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-6 animate-in fade-in duration-300">
              <Card className="rounded-3xl border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Management Mode
                  </CardTitle>
                  <CardDescription className="text-xs font-bold text-muted-foreground">
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
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          value={agencyProfile.name}
                          onChange={(e) => updateAgencyProfile({ name: e.target.value })}
                          className="rounded-xl pl-11 h-12 bg-background border-border/60 focus-visible:ring-primary text-foreground font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">License (NPN)</Label>
                      <div className="relative group">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          value={agencyProfile.licenseNumber}
                          onChange={(e) => updateAgencyProfile({ licenseNumber: e.target.value })}
                          className="rounded-xl pl-11 h-12 bg-background border-border/60 font-mono text-foreground"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">Public Phone</Label>
                      <div className="relative group">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          value={agencyProfile.phone}
                          onChange={(e) => updateAgencyProfile({ phone: e.target.value })}
                          className="rounded-xl pl-11 h-12 bg-background border-border/60 text-foreground"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-foreground ml-1">Admin Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          value={agencyProfile.email}
                          onChange={(e) => updateAgencyProfile({ email: e.target.value })}
                          className="rounded-xl pl-11 h-12 bg-background border-border/60 text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding" className="space-y-6 animate-in fade-in duration-300">
              <Card className="rounded-3xl border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    White-Label Customization
                  </CardTitle>
                  <CardDescription className="text-xs font-bold text-muted-foreground">
                    Customize the appearance of member notifications and the benefits summary mailers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                      <Label className="text-xs font-black uppercase tracking-widest text-foreground">Primary Branding Color</Label>
                      <div className="flex gap-4 items-center">
                        <div 
                          className="w-16 h-16 rounded-2xl border-4 border-background shadow-xl shrink-0" 
                          style={{ backgroundColor: agencyProfile.primaryColor || '#B08627' }}
                        />
                        <div className="flex-1 space-y-2">
                          <Input 
                            type="text" 
                            placeholder="#B08627" 
                            className="h-10 rounded-xl font-mono text-xs text-foreground" 
                            value={agencyProfile.primaryColor}
                            onChange={(e) => updateAgencyProfile({ primaryColor: e.target.value })}
                          />
                          <p className="text-[10px] text-muted-foreground font-bold">Used for PDF headers and button highlights.</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-xs font-black uppercase tracking-widest text-foreground">Agency Logo (High Res)</Label>
                      <div className="border-2 border-dashed border-muted rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-muted/5 cursor-pointer hover:bg-muted/10 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                          <Globe className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Upload SVG or PNG</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-6 animate-in fade-in duration-300">
              <Card className="rounded-3xl border shadow-sm bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    Global Alert Routing
                  </CardTitle>
                  <CardDescription className="text-xs font-bold text-muted-foreground">
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
                    <div key={i} className="flex items-center justify-between p-5 rounded-2xl border bg-muted/10">
                      <div className="space-y-1">
                        <Label className="text-sm font-black text-foreground">{notif.label}</Label>
                        <p className="text-[11px] text-muted-foreground font-bold leading-relaxed">{notif.desc}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-6 animate-in fade-in duration-300">
              <Card className="rounded-3xl border shadow-sm bg-slate-900 text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Lock className="w-32 h-32" />
                </div>
                <CardHeader className="relative z-10">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Security & BAA Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AWS Bedrock BAA</span>
                        <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[8px] font-bold">SIGNED</div>
                      </div>
                      <p className="text-[11px] text-slate-200 font-bold leading-relaxed">
                        Covers all Claude 3.5 Sonnet processing of PHI data under HIPAA Business Associate standards.
                      </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">MFA Status</span>
                        <div className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[8px] font-bold">REQUIRED</div>
                      </div>
                      <p className="text-[11px] text-slate-200 font-bold leading-relaxed">
                        Agency-wide biometric MFA is enforced for all broker logins to protect member health records.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 flex flex-col md:flex-row md:items-center justify-between border-t border-white/10 gap-4">
                    <div className="flex items-center gap-3">
                      <Fingerprint className="w-5 h-5 text-primary" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-300">Encryption Key:</span>
                      <code className="text-[10px] bg-white/10 px-3 py-1.5 rounded-lg font-mono text-emerald-400">MS-AES-256-***-B9</code>
                    </div>
                    <Button variant="link" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white p-0 h-auto">
                      Review Audit History
                    </Button>
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
