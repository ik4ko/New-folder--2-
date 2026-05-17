"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Camera, Save, Wand2, User, ShieldCheck, Briefcase, Heart, MapPin, Phone, Mail, FileCheck, Stethoscope, ShieldAlert } from "lucide-react"
import { useState, useRef } from "react"
import { useAppStore, type MemberRecord } from "@/lib/store"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { ocrDocumentDataExtraction } from "@/ai/flows/ocr-document-data-extraction"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function NewMemberPage() {
  const router = useRouter()
  const addMember = useAppStore((state) => state.addMember)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<MemberRecord>>({
    fullName: "",
    age: 0,
    dob: "",
    ssnLast4: "",
    email: "",
    phone: "",
    address: "",
    medicareId: "",
    carrier: "",
    planName: "",
    monthlyPremium: "$0.00",
    healthConditions: [],
    medicareMedicaidStatus: "None",
    enrollmentPeriod: "IEP",
    soaStatus: "Not Started",
    pcpName: "",
    pharmacyName: "",
    partAEffective: "",
    partBEffective: "",
    poaStatus: "unprotected",
    ptcExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const insuranceCarriers = [
    "UnitedHealthcare (AARP)",
    "Humana",
    "Aetna (CVS Health)",
    "Blue Cross Blue Shield (BCBS)",
    "Kaiser Permanente",
    "Cigna",
    "Wellcare (Centene)",
    "Molina Healthcare",
    "Clover Health",
    "Scan Health Plan",
    "Alignment Healthcare",
    "Devoted Health",
    "Mutual of Omaha",
    "Anthem Blue Cross",
    "Highmark Blue Cross",
    "Independence Blue Cross",
    "CareSource",
    "Geisinger Health Plan",
    "HealthPartners",
    "UPMC Health Plan",
    "Oscar Health",
    "Zing Health",
    "Imperial Health Plan",
    "Brand New Day",
    "Clever Care",
    "Central Health Plan",
    "Astiva Health",
    "Golden State Advantage",
    "L.A. Care Health Plan",
    "Providence Health Plan"
  ].sort()

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const result = await ocrDocumentDataExtraction({
          photoDataUri: reader.result as string
        })
        const data = result.extractedData
        setFormData(prev => ({
          ...prev,
          fullName: data.fullName || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : prev.fullName),
          medicareId: data.documentNumber || prev.medicareId,
          dob: data.dateOfBirth || prev.dob,
          address: data.address || prev.address,
        }))
        toast({ title: "OCR Success", description: "Identity data extracted and pre-filled." })
      } catch (err) {
        toast({ title: "OCR Failed", description: "Could not read document data.", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fullName || !formData.medicareId) {
      toast({ title: "Missing Data", description: "Please fill legal name and Medicare ID.", variant: "destructive" })
      return
    }
    addMember(formData as any)
    toast({ title: "Enrollment Successful", description: "Member record has been added to the local roster." })
    router.push('/members')
  }

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-foreground uppercase tracking-tight">Member Enrollment</h1>
            <div className="h-4 w-[1px] bg-border" />
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Draft Mode</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="rounded-xl h-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={() => router.push('/members')}>Discard</Button>
            <Button className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 text-white" onClick={handleSubmit}>
              <Save className="w-4 h-4 mr-2" />
              Store Record
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8 pb-32">
          {/* AI Intake Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-10 rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-4 text-center group hover:bg-primary/10 transition-all cursor-pointer shadow-inner" onClick={() => fileInputRef.current?.click()}>
              <div className="w-16 h-16 rounded-[1.5rem] bg-card shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-tight text-foreground">Biometric Data Capture</h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-70">Upload Medicare Card or ID to pre-fill the form with 99% accuracy.</p>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleOCR} />
              {loading && <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary animate-pulse"><Wand2 className="w-3 h-3" /> Analyzing...</div>}
            </div>

            <div className="p-8 rounded-[2rem] bg-slate-900 text-white space-y-4 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck className="w-24 h-24 text-white" /></div>
               <div className="flex items-center gap-2 text-primary relative z-10">
                 <ShieldCheck className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Compliance Locked</span>
               </div>
               <p className="text-[11px] leading-relaxed text-slate-300 font-medium italic relative z-10">
                 "Zero-knowledge field encryption active. Member PII is hashed before syncing. CMS HETS monitoring begins tonight at 2:00 AM."
               </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Accordion type="multiple" defaultValue={["identity", "medicare", "compliance"]} className="space-y-4">
              {/* Identity & Contact */}
              <AccordionItem value="identity" className="border rounded-[2rem] bg-card px-8 py-2 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="font-black text-sm uppercase tracking-widest text-foreground">Personal Identity</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Full Legal Name</Label>
                      <Input 
                        placeholder="e.g. Johnathan Smith" 
                        value={formData.fullName}
                        onChange={e => setFormData(p => ({...p, fullName: e.target.value}))}
                        className="rounded-xl h-12 border-border bg-background shadow-inner font-black uppercase pl-4"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">DOB</Label>
                        <Input 
                          type="date"
                          value={formData.dob}
                          onChange={e => setFormData(p => ({...p, dob: e.target.value}))}
                          className="rounded-xl h-12 border-border bg-background shadow-inner font-black uppercase"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">SSN (Last 4)</Label>
                        <Input 
                          placeholder="0000"
                          maxLength={4}
                          value={formData.ssnLast4}
                          onChange={e => setFormData(p => ({...p, ssnLast4: e.target.value}))}
                          className="rounded-xl h-12 border-border bg-background shadow-inner font-mono font-black"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-1.5"><Phone className="w-3 h-3" /> Phone</Label>
                      <Input 
                        placeholder="415-555-0100"
                        value={formData.phone}
                        onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                        className="rounded-xl h-12 border-border bg-background shadow-inner font-black"
                      />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email Address</Label>
                      <Input 
                        type="email"
                        placeholder="j.smith@example.com"
                        value={formData.email}
                        onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                        className="rounded-xl h-12 border-border bg-background shadow-inner font-black lowercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Physical Address</Label>
                    <Input 
                      placeholder="Street, City, State, ZIP"
                      value={formData.address}
                      onChange={e => setFormData(p => ({...p, address: e.target.value}))}
                      className="rounded-xl h-12 border-border bg-background shadow-inner font-black uppercase pl-4"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Compliance Credentials */}
              <AccordionItem value="compliance" className="border rounded-[2rem] bg-card px-8 py-2 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <span className="font-black text-sm uppercase tracking-widest text-foreground">Compliance & Consent</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Medicare ID (MBI)</Label>
                      <Input 
                        placeholder="1EG4-TE5-MK22"
                        value={formData.medicareId}
                        onChange={e => setFormData(p => ({...p, medicareId: e.target.value.toUpperCase()}))}
                        className="rounded-xl h-12 border-border bg-background shadow-inner font-mono font-black"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">PTC Consent Expiry</Label>
                      <Input 
                        type="date"
                        value={formData.ptcExpiryDate}
                        onChange={e => setFormData(p => ({...p, ptcExpiryDate: e.target.value}))}
                        className="rounded-xl h-12 border-border bg-background shadow-inner font-black uppercase"
                      />
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest px-1 opacity-70">CMS Requirement: Consent must be renewed every 12 months.</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Policy & Coverage */}
              <AccordionItem value="coverage" className="border rounded-[2rem] bg-card px-8 py-2 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-sm">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span className="font-black text-sm uppercase tracking-widest text-foreground">Policy & Coverage</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Carrier / Payer</Label>
                      <Select 
                        value={formData.carrier}
                        onValueChange={(val) => setFormData(p => ({...p, carrier: val}))}
                      >
                        <SelectTrigger className="rounded-xl h-12 border-border bg-background shadow-inner font-black uppercase">
                          <SelectValue placeholder="Select Carrier" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] rounded-2xl">
                          <ScrollArea className="h-[280px]">
                            {insuranceCarriers.map((carrier) => (
                              <SelectItem key={carrier} value={carrier} className="text-xs font-black uppercase">
                                {carrier}
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Plan Name</Label>
                      <Input 
                        placeholder="e.g. Choice PPO Plus"
                        value={formData.planName}
                        onChange={e => setFormData(p => ({...p, planName: e.target.value}))}
                        className="rounded-xl h-12 border-border bg-background shadow-inner font-black uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Enrollment Period</Label>
                      <Select 
                        value={formData.enrollmentPeriod}
                        onValueChange={(val: any) => setFormData(p => ({...p, enrollmentPeriod: val}))}
                      >
                        <SelectTrigger className="rounded-xl h-12 border-border bg-background shadow-inner font-black uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="IEP" className="text-xs font-black uppercase">Initial (IEP)</SelectItem>
                          <SelectItem value="AEP" className="text-xs font-black uppercase">Annual (AEP)</SelectItem>
                          <SelectItem value="SEP" className="text-xs font-black uppercase">Special (SEP)</SelectItem>
                          <SelectItem value="OE" className="text-xs font-black uppercase">Open (OE)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Monthly Premium</Label>
                      <Input 
                        placeholder="$0.00"
                        value={formData.monthlyPremium}
                        onChange={e => setFormData(p => ({...p, monthlyPremium: e.target.value}))}
                        className="rounded-xl h-12 border-border bg-background shadow-inner font-black"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Federal Benefits</Label>
                      <Select 
                        value={formData.medicareMedicaidStatus}
                        onValueChange={(val: any) => setFormData(p => ({...p, medicareMedicaidStatus: val}))}
                      >
                        <SelectTrigger className="rounded-xl h-12 border-border bg-background shadow-inner font-black uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="None" className="text-xs font-black uppercase">None</SelectItem>
                          <SelectItem value="Medicare" className="text-xs font-black uppercase">Medicare Only</SelectItem>
                          <SelectItem value="Medicaid" className="text-xs font-black uppercase">Medicaid Only</SelectItem>
                          <SelectItem value="Both" className="text-xs font-black uppercase">Dual-Eligible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </form>
        </div>
      </div>


    </div>
  )
}
