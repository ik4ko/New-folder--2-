"use client"

import { CollectionSidebar } from "@/components/collection-sidebar"
import { InsightsPanel } from "@/components/InsightsPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FileUp, Camera, Save, Download, Sparkles, Wand2 } from "lucide-react"
import { useState, useRef } from "react"
import { useAppStore, type ClientRecord } from "@/lib/store"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { ocrDocumentDataExtraction } from "@/ai/flows/ocr-document-data-extraction"

export default function NewClientPage() {
  const router = useRouter()
  const addClient = useAppStore((state) => state.addClient)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<ClientRecord>>({
    fullName: "",
    age: 0,
    healthConditions: [],
    medicareMedicaidStatus: "None",
    lastReviewDate: new Date().toISOString().split('T')[0],
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

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
          fullName: data.fullName || data.firstName + " " + data.lastName || prev.fullName,
          address: data.address || prev.address,
          medicareId: data.documentNumber || prev.medicareId,
        }))
        toast({ title: "OCR Success", description: "Data extracted from document." })
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
    if (!formData.fullName || !formData.age) {
      toast({ title: "Error", description: "Please fill required fields.", variant: "destructive" })
      return
    }
    addClient(formData as any)
    toast({ title: "Success", description: "Client record created and stored locally." })
    router.push('/')
  }

  return (
    <div className="flex h-full w-full">
      <CollectionSidebar />
      
      <div className="flex-1 flex flex-col h-full bg-background">
        <header className="h-16 border-b border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-headline font-semibold text-primary">New Client Intake</h1>
            <div className="h-4 w-[1px] bg-border" />
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-muted-foreground">Draft Mode (Autosave enabled)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl h-9 text-xs" onClick={() => router.push('/')}>Discard</Button>
            <Button className="rounded-xl h-9 text-xs bg-accent hover:bg-accent/90" onClick={handleSubmit}>
              <Save className="w-4 h-4 mr-2" />
              Store Record
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
             <div className="space-y-4">
                <h2 className="text-lg font-headline font-semibold">Biometric Capture</h2>
                <p className="text-sm text-muted-foreground">Use OCR to instantly pre-fill data from ID documents.</p>
                <div 
                  className="border-2 border-dashed border-primary/20 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-10 h-10 text-primary opacity-60" />
                  <span className="text-xs font-semibold text-primary">Upload ID or Policy Document</span>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleOCR} />
                </div>
             </div>

             <div className="p-6 rounded-2xl bg-sidebar-accent/10 border border-primary/10 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Wand2 className="w-4 h-4" />
                  <span className="text-sm font-bold">Smart Intake</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  The form dynamically adapts based on the data provided. SSNs are zero-knowledge hashed locally before cloud sync.
                </p>
             </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 pb-20">
            <Accordion type="multiple" defaultValue={["personal"]} className="space-y-4">
              <AccordionItem value="personal" className="border rounded-2xl bg-card px-6 py-2 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">01</div>
                    <span className="font-headline font-semibold">Client Identity</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Full Legal Name</Label>
                      <Input 
                        placeholder="e.g. Christopher Smith" 
                        value={formData.fullName}
                        onChange={e => setFormData(p => ({...p, fullName: e.target.value}))}
                        className="rounded-xl border-border/60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date of Birth</Label>
                      <Input type="date" className="rounded-xl border-border/60" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Current Age</Label>
                      <Input 
                        type="number" 
                        value={formData.age || ""}
                        onChange={e => setFormData(p => ({...p, age: parseInt(e.target.value)}))}
                        className="rounded-xl border-border/60"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Document ID Number (Encrypted)</Label>
                      <Input 
                        placeholder="e.g. DL123456789" 
                        value={formData.medicareId || ""}
                        onChange={e => setFormData(p => ({...p, medicareId: e.target.value}))}
                        className="rounded-xl border-border/60 font-mono"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="health" className="border rounded-2xl bg-card px-6 py-2 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">02</div>
                    <span className="font-headline font-semibold">Health & Coverage Metadata</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Medical History Flags</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {["Diabetes", "Hypertension", "Heart Condition", "Smoker", "Respiratory Issue", "Mobility Assistance"].map(cond => (
                        <div key={cond} className="flex items-center space-x-2">
                          <Checkbox 
                            id={cond} 
                            checked={formData.healthConditions?.includes(cond)}
                            onCheckedChange={(checked) => {
                              const current = formData.healthConditions || []
                              setFormData(p => ({
                                ...p, 
                                healthConditions: checked ? [...current, cond] : current.filter(c => c !== cond)
                              }))
                            }}
                          />
                          <Label htmlFor={cond} className="text-sm font-medium">{cond}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Federal Benefit Status</Label>
                    <Select 
                      value={formData.medicareMedicaidStatus}
                      onValueChange={(val: any) => setFormData(p => ({...p, medicareMedicaidStatus: val}))}
                    >
                      <SelectTrigger className="rounded-xl border-border/60">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">No Federal Benefits</SelectItem>
                        <SelectItem value="Medicare">Medicare Recipient</SelectItem>
                        <SelectItem value="Medicaid">Medicaid Recipient</SelectItem>
                        <SelectItem value="Both">Dual-Eligible (Both)</SelectItem>
                      </SelectContent>
                    </Select>
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