"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { InsightsPanel } from "@/components/insights-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Camera, Save, Wand2, User, ShieldCheck, Briefcase, Heart, MapPin, Phone, Mail, FileCheck, Stethoscope } from "lucide-react"
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
            <h1 className="text-xl font-bold text-foreground">Member Enrollment</h1>
            <div className="h-4 w-[1px] bg-border" />
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Draft Mode</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl h-10 text-xs font-bold" onClick={() => router.push('/members')}>Discard</Button>
            <Button className="rounded-xl h-10 text-xs font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" onClick={handleSubmit}>
              <Save className="w-4 h-4 mr-2" />
              Store Member Record
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8 pb-32">
          {/* AI Intake Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-8 rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-4 text-center group hover:bg-primary/10 transition-all cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-16 h-16 rounded-2xl bg-card shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Biometric Data Capture</h3>
                <p className="text-xs text-foreground font-semibold">Upload ID, Medicare Card, or Policy Document to pre-fill 70% of this form.</p>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleOCR} />
              {loading && <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary animate-pulse"><Wand2 className="w-3 h-3" /> Analyzing...</div>}
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl">
               <div className="flex items-center gap-2 text-primary">
                 <ShieldCheck className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Compliance Mode</span>
               </div>
               <p className="text-[11px] leading-relaxed text-slate-300 font-medium italic">
                 "Zero-knowledge encryption active. All member PII is hashed before syncing. CMS cross-check occurs during nightly poll."
               </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Accordion type="multiple" defaultValue={["identity", "medicare", "coverage"]} className="space-y-4">
              {/* Identity & Contact */}
              <AccordionItem value="identity" className="border rounded-2xl bg-card px-6 py-2 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-widest text-foreground">Personal Identity</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1">Full Legal Name</Label>
                      <Input 
                        placeholder="e.g. Johnathan Smith" 
                        value={formData.fullName}
                        onChange={e => setFormData(p => ({...p, fullName: e.target.value}))}
                        className="rounded-xl h-11 border-border bg-background"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1">DOB</Label>
                        <Input 
                          type="date"
                          value={formData.dob}
                          onChange={e => setFormData(p => ({...p, dob: e.target.value}))}
                          className="rounded-xl h-11 border-border bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1">SSN (Last 4)</Label>
                        <Input 
                          placeholder="0000"
                          maxLength={4}
                          value={formData.ssnLast4}
                          onChange={e => setFormData(p => ({...p, ssnLast4: e.target.value}))}
                          className="rounded-xl h-11 border-border bg-background font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1 flex items-center gap-1.5"><Phone className="w-3 h-3" /> Phone</Label>
                      <Input 
                        placeholder="415-555-0100"
                        value={formData.phone}
                        onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                        className="rounded-xl h-11 border-border bg-background"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1 flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email Address</Label>
                      <Input 
                        type="email"
                        placeholder="j.smith@example.com"
                        value={formData.email}
                        onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                        className="rounded-xl h-11 border-border bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Physical Address</Label>
                    <Input 
                      placeholder="Street, City, State, ZIP"
                      value={formData.address}
                      onChange={e => setFormData(p => ({...p, address: e.target.value}))}
                      className="rounded-xl h-11 border-border bg-background"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Medicare Credentials */}
              <AccordionItem value="medicare" className="border rounded-2xl bg-card px-6 py-2 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-widest text-foreground">Medicare Credentials</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1">Medicare ID (MBI)</Label>
                      <Input 
                        placeholder="1EG4-TE5-MK22"
                        value={formData.medicareId}
                        onChange={e => setFormData(p => ({...p, medicareId: e.target.value.toUpperCase()}))}
                        className="rounded-xl h-11 border-border bg-background font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1">Part A Effective</Label>
                      <Input 
                        type="date"
                        value={formData.partAEffective}
                        onChange={e => setFormData(p => ({...p, partAEffective: e.target.value}))}
                        className="rounded-xl h-11 border-border bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1">Part B Effective</Label>
                      <Input 
                        type="date"
                        value={formData.partBEffective}
                        onChange={e => setFormData(p => ({...p, partBEffective: e.target.value}))}
                        className="rounded-xl h-11 border-border bg-background"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Policy & Coverage */}
              <AccordionItem value="coverage" className="border rounded-2xl bg-card px-6 py-2 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-widest text-foreground">Policy & Coverage</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1">Carrier / Payer</Label>
                      <Select 
                        value={formData.carrier}
                        onValueChange={(val) => setFormData(p => ({...p, carrier: val}))}
                      >
                        <SelectTrigger className="rounded-xl h-11 border-border bg-background">
                          <SelectValue placeholder="Select Carrier" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <ScrollArea className="h-[280px]">
                            {insuranceCarriers.map((carrier) => (
                              <SelectItem key={carrier} value={carrier}>
                                {carrier}
                              </SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1">Plan Name</Label>
                      <Input 
                        placeholder="e.g. Choice PPO Plus"
                        value={formData.planName}
                        onChange={e => setFormData(p => ({...p, planName: e.target.value}))}
                        className="rounded-xl h-11 border-border bg-background"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1">Enrollment Period</Label>
                      <Select 
                        value={formData.enrollmentPeriod}
                        onValueChange={(val: any) => setFormData(p => ({...p, enrollmentPeriod: val}))}
                      >
                        <SelectTrigger className="rounded-xl h-11 border-border bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IEP">Initial Enrollment (IEP)</SelectItem>
                          <SelectItem value="AEP">Annual Enrollment (AEP)</SelectItem>
                          <SelectItem value="SEP">Special Enrollment (SEP)</SelectItem>
                          <SelectItem value="OE">Open Enrollment (OE)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1">Monthly Premium</Label>
                      <Input 
                        placeholder="$0.00"
                        value={formData.monthlyPremium}
                        onChange={e => setFormData(p => ({...p, monthlyPremium: e.target.value}))}
                        className="rounded-xl h-11 border-border bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1">Federal Benefits</Label>
                      <Select 
                        value={formData.medicareMedicaidStatus}
                        onValueChange={(val: any) => setFormData(p => ({...p, medicareMedicaidStatus: val}))}
                      >
                        <SelectTrigger className="rounded-xl h-11 border-border bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Medicare">Medicare Only</SelectItem>
                          <SelectItem value="Medicaid">Medicaid Only</SelectItem>
                          <SelectItem value="Both">Dual-Eligible (Both)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Health & Providers */}
              <AccordionItem value="health" className="border rounded-2xl bg-card px-6 py-2 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-600">
                      <Heart className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-widest text-foreground">Health & Providers</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1">Chronic Care Identifiers</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {["Diabetes", "Hypertension", "Heart Condition", "Respiratory Issue", "Mobility Issues"].map(cond => (
                        <div key={cond} className="flex items-center space-x-3 p-3 rounded-xl border bg-background hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => {
                          const current = formData.healthConditions || []
                          setFormData(p => ({
                            ...p, 
                            healthConditions: current.includes(cond) ? current.filter(c => c !== cond) : [...current, cond]
                          }))
                        }}>
                          <Checkbox id={cond} checked={formData.healthConditions?.includes(cond)} className="rounded-full border-foreground" />
                          <Label htmlFor={cond} className="text-xs font-bold cursor-pointer text-foreground">{cond}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1 flex items-center gap-1.5"><Stethoscope className="w-3 h-3" /> PCP Name</Label>
                      <Input 
                        placeholder="Dr. Alexander Wright"
                        value={formData.pcpName}
                        onChange={e => setFormData(p => ({...p, pcpName: e.target.value}))}
                        className="rounded-xl h-11 border-border bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-foreground tracking-widest ml-1">Preferred Pharmacy</Label>
                      <Input 
                        placeholder="CVS #1204 / Walgreens"
                        value={formData.pharmacyName}
                        onChange={e => setFormData(p => ({...p, pharmacyName: e.target.value}))}
                        className="rounded-xl h-11 border-border bg-background"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </form>
        </div>
      </div>

      <InsightsPanel member={formData as any} />
    </div>
  )
}
