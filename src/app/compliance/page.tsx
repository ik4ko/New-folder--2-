"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ShieldCheck, FileCheck, Lock, History, Search, Download, 
  FileText, Database, ShieldAlert, FileSignature, Files, 
  ExternalLink, CheckCircle2, AlertCircle, Clock, Filter, Trash2
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { useState } from "react"

export default function ComplianceVaultPage() {
  const members = useAppStore((state) => state.members)
  const [search, setSearch] = useState("")

  const complianceTemplates = [
    { id: 'soa-2025', title: 'Scope of Appointment (SOA)', version: '2025.1', status: 'Approved', type: 'PDF', size: '1.2 MB' },
    { id: 'ptc-gen', title: 'Permission to Contact (PTC)', version: '2.0', status: 'Approved', type: 'DOCX', size: '450 KB' },
    { id: 'baa-agency', title: 'Agency Business Associate Agreement', version: '4.2', status: 'Latest', type: 'PDF', size: '2.8 MB' },
    { id: 'lis-discl', title: 'LIS / Extra Help Disclosure', version: '1.5', status: 'Approved', type: 'PDF', size: '890 KB' },
    { id: 'pre-enroll', title: 'Pre-Enrollment Checklist', version: '2025.A', status: 'Required', type: 'PDF', size: '1.1 MB' },
    { id: 'tpmo-disc', title: 'TPMO Disclaimer (Standard)', version: '1.0', status: 'Approved', type: 'DOCX', size: '120 KB' },
  ]

  const auditLogs = [
    { id: 1, event: "PHI_ACCESS", user: "Broker JD", target: "Member #8821", timestamp: "2024-11-20 10:45:02", status: "AUTHORIZED", ip: "192.168.1.44" },
    { id: 2, event: "DATA_EXPORT", user: "Admin Sarah", target: "Full Roster", timestamp: "2024-11-20 09:12:11", status: "AUTHORIZED", ip: "192.168.1.12" },
    { id: 3, event: "SOA_SIGNATURE", user: "System", target: "Member #9KL2", timestamp: "2024-11-19 16:30:45", status: "VERIFIED", ip: "CMS_BRIDGE" },
    { id: 4, event: "LOGIN_SUCCESS", user: "Broker JD", target: "N/A", timestamp: "2024-11-19 08:00:01", status: "MFA_PASSED", ip: "192.168.1.44" },
    { id: 5, event: "SFTP_PUSH", user: "Module 3 Bot", target: "Provider NPI-992", timestamp: "2024-11-18 14:22:33", status: "ENCRYPTED", ip: "DOCUMO_API" },
  ]

  const handleAction = (title: string, description: string) => {
    toast({
      title: title,
      description: description,
    })
  }

  const handleDownloadTemplate = (title: string) => {
    handleAction("Downloading Template", `Preparing ${title} for offline use...`)
  }

  const filteredSoaArchive = members.filter(m => 
    m.soaStatus === 'Completed' && 
    (m.fullName.toLowerCase().includes(search.toLowerCase()) || m.medicareId.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Compliance Vault</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Immutable PHI & SOA Archive</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="rounded-2xl h-10 text-xs font-bold border-border"
              onClick={() => handleAction("Data Export Initiated", "Generating secure snapshot of compliance records...")}
            >
              <Database className="w-4 h-4 mr-2" /> Data Export
            </Button>
            <Button 
              className="rounded-2xl h-10 text-xs font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              onClick={() => handleAction("Audit Package Ready", "The multi-year audit bundle has been prepared for regulator review.")}
            >
              <FileCheck className="w-4 h-4 mr-2" />
              Generate Audit Package
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30 dark:bg-background">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="rounded-3xl border-none shadow-sm bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">SOA Integrity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-700">99.2%</div>
                <p className="text-[10px] text-emerald-600/70 mt-1 font-bold">Audit Target: &gt;95%</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-primary tracking-widest">Signed SOAs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-primary">{members.filter(m => m.soaStatus === 'Completed').length}</div>
                <p className="text-[10px] text-primary/70 mt-1 font-bold">10-year retention</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">PTC Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">892</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold">Active Permissions</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-none shadow-sm bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">BAA Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-600">Active</div>
                <p className="text-[10px] text-muted-foreground mt-1 font-bold">3 Signed Carriers</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="archive" className="space-y-6">
            <TabsList className="bg-white dark:bg-card p-1 rounded-2xl border shadow-sm h-12 gap-2">
              <TabsTrigger value="archive" className="rounded-xl px-6 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Files className="w-4 h-4 mr-2" /> Document Archive
              </TabsTrigger>
              <TabsTrigger value="templates" className="rounded-xl px-6 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileSignature className="w-4 h-4 mr-2" /> Template Library
              </TabsTrigger>
              <TabsTrigger value="audit" className="rounded-xl px-6 py-2 text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <History className="w-4 h-4 mr-2" /> PHI Audit Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="archive" className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <FileText className="w-4 h-4 text-primary" />
                  Scope of Appointment (SOA) Repository
                </h2>
                <div className="flex gap-3">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Search archive..." 
                      className="pl-9 h-10 rounded-2xl text-[11px] bg-card border-none shadow-sm text-foreground"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl border-none bg-card shadow-sm" onClick={() => handleAction("Filters Reset", "Roster view has been cleared.")}>
                    <Filter className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              
              <Card className="rounded-3xl border-none shadow-sm bg-card overflow-hidden">
                <div className="divide-y">
                  {filteredSoaArchive.length > 0 ? filteredSoaArchive.map((member, i) => (
                    <div key={i} className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-inner">
                          <FileSignature className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{member.fullName}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Signed: {member.soaDate || 'Unknown'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">{member.medicareId}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-0.5">VERIFIED E-SIGN</Badge>
                        <div className="flex gap-2">
                           <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary transition-all" onClick={() => handleAction("Opening Document", `Accessing SOA record for ${member.fullName}...`)}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary transition-all" onClick={() => handleDownloadTemplate(`SOA_${member.fullName}`)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-12 text-center text-muted-foreground font-medium flex flex-col items-center gap-3">
                      <AlertCircle className="w-8 h-8 opacity-20" />
                      No signed SOAs matching your search in the archive.
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Files className="w-4 h-4 text-primary" />
                  Compliance & Enrollment Templates
                </h2>
                <Button variant="outline" size="sm" className="rounded-xl h-9 text-[10px] font-bold uppercase tracking-widest border-primary/20 text-primary" onClick={() => handleAction("Updating Library", "Syncing with latest CMS model forms...")}>
                  Check for Updates
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {complianceTemplates.map((template) => (
                  <Card key={template.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all group bg-card">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <Badge variant="secondary" className="text-[9px] font-bold uppercase">{template.type}</Badge>
                      </div>
                      <CardTitle className="text-sm font-bold mt-4 text-foreground">{template.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <CardDescription className="text-[10px] font-medium">Version {template.version}</CardDescription>
                        <span className="text-[10px] text-muted-foreground opacity-50">•</span>
                        <span className="text-[10px] text-muted-foreground font-medium">{template.size}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{template.status}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleAction("Previewing Template", `Viewing ${template.title} version ${template.version}`)}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            onClick={() => handleDownloadTemplate(template.title)}
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[10px] font-bold rounded-xl"
                          >
                            <Download className="w-3.5 h-3.5 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card 
                  className="rounded-3xl border-2 border-dashed border-muted bg-transparent flex items-center justify-center p-8 group hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => handleAction("Upload Triggered", "Select custom compliance forms to store in the vault.")}
                >
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Files className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upload Custom Form</p>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="audit" className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <History className="w-4 h-4 text-primary" />
                  Immutable PHI Access & Modification Trail
                </h2>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" className="rounded-xl h-9 text-[10px] font-bold" onClick={() => handleAction("Audit Log Exported", "The PHI trail has been exported as an encrypted CSV.")}>
                    <Download className="w-3.5 h-3.5 mr-2" /> Export Trail
                  </Button>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                    <Clock className="w-3 h-3" />
                    Retention: 10 Years (HIPAA Required)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Card className="rounded-3xl border-none shadow-sm bg-card overflow-hidden">
                  <div className="divide-y">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="px-8 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-6">
                          <div className={`w-2 h-2 rounded-full ${log.event.includes('LOGIN') ? 'bg-blue-500' : log.event.includes('ACCESS') ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <div className="min-w-[120px]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{log.event}</p>
                            <p className="text-xs font-bold text-foreground">{log.user}</p>
                          </div>
                          <div className="hidden md:block">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Target</p>
                            <p className="text-xs font-medium text-foreground">{log.target}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Timestamp</p>
                            <p className="text-[10px] font-mono font-bold text-foreground">{log.timestamp}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className={`text-[9px] font-black uppercase border-none px-2 ${log.status === 'AUTHORIZED' || log.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                              {log.status}
                            </Badge>
                            <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{log.ip}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="rounded-3xl border-none shadow-xl bg-slate-900 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Lock className="w-20 h-24 text-white" />
                  </div>
                  <div className="p-8 font-mono text-[10px] space-y-2 relative z-10 leading-relaxed">
                    <p className="text-slate-500 border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="w-3 h-3" /> // IMMUTABLE AUDIT TRAIL // HIPAA LOGGING ACTIVE // AES-256 ENCRYPTED
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 text-[8px] text-slate-400 hover:text-white" onClick={() => handleAction("Terminal Cleared", "Local session cache reset.")}>
                        <Trash2 className="w-2.5 h-3 mr-1" /> Clear Cache
                      </Button>
                    </p>
                    <div className="space-y-1.5 overflow-hidden">
                      <p className="animate-in fade-in slide-in-from-left-2 duration-300"><span className="text-emerald-400">[2024-11-20 10:42:11]</span> <span className="text-slate-400">USER_AUTH:</span> Agent ID 123 authenticated via MFA (Biometric)</p>
                      <p className="animate-in fade-in slide-in-from-left-2 duration-500"><span className="text-emerald-400">[2024-11-20 10:45:02]</span> <span className="text-slate-400">PHI_ACCESS:</span> Record ID 8821 accessed for SSBCI module verification</p>
                      <p className="animate-in fade-in slide-in-from-left-2 duration-700"><span className="text-amber-400">[2024-11-20 11:02:45]</span> <span className="text-slate-400">DATA_SYNC:</span> Blue Button 2.0 refresh initiated for cluster A (Success)</p>
                      <p className="animate-in fade-in slide-in-from-left-2 duration-1000"><span className="text-emerald-400">[2024-11-20 11:30:00]</span> <span className="text-slate-400">SYSTEM:</span> Automated check of AEP Shield consent flags completed (1,244 scanned)</p>
                      <p className="animate-in fade-in slide-in-from-left-2 duration-1000 delay-200"><span className="text-blue-400">[2024-11-20 12:15:33]</span> <span className="text-slate-400">FAX_SENT:</span> SSBCI-PKG-SJ transmitted to Provider ID NPI-99201</p>
                      <p className="animate-in fade-in slide-in-from-left-2 duration-1000 delay-300"><span className="text-emerald-400">[2024-11-20 13:02:11]</span> <span className="text-slate-400">SOA_GEN:</span> Compliance document generated for Member ID 9KL2-PX1-ZZ09</p>
                    </div>
                    <div className="pt-4 flex items-center justify-between text-slate-500 italic border-t border-slate-800 mt-4">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-slate-800 text-slate-400 border-none text-[8px] font-black">SHA-256: 8f2e...3a11</Badge>
                        <span>Records signed with HMAC-SHA256</span>
                      </div>
                      <Button variant="link" className="h-auto p-0 text-[9px] text-primary" onClick={() => handleAction("Verifying Chain", "Checking cryptographic integrity of audit blocks...")}>Verify Chain</Button>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <div className="p-10 rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary shadow-inner">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Agency BAA & Compliance Lock</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                All records within the MediStay Compliance Vault are encrypted with AES-256 at rest. Access is strictly audited and logged to ensure HIPAA 5010 standard compliance. Documents are retained for the federally mandated 10-year period.
              </p>
              <Button 
                variant="link" 
                className="text-xs font-bold text-primary underline-offset-4"
                onClick={() => handleAction("Legal Review", "Loading latest signed Business Associate Agreement...")}
              >
                Review Agency BAA Agreement
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
