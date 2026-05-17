'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, ArrowLeft, ArrowRight, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { getVCCCarriers, submitVCC } from '@/app/actions/vcc-submit'

interface Carrier { id: string; carrier: string; carrier_display_name: string; year: number }

interface FormState {
  carrier_id: string
  client_name: string
  client_dob: string
  medicare_id: string
  doctor_name: string
  doctor_fax: string
  broker_npn: string
  ghl_contact_id: string
  send_fax: boolean
}

const STEPS = ['Carrier', 'Client Info', 'Review', 'Dispatch']

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
      <p className="text-[10px] font-bold text-red-400">{msg}</p>
    </div>
  )
}

export default function VCCNewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState(1)
  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [form, setForm] = useState<FormState>({
    carrier_id: '',
    client_name: '',
    client_dob: '',
    medicare_id: '',
    doctor_name: '',
    doctor_fax: '',
    broker_npn: '',
    ghl_contact_id: searchParams?.get('contact_id') ?? '',
    send_fax: true,
  })

  useEffect(() => {
    getVCCCarriers().then(setCarriers)
  }, [])

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  const selectedCarrier = carriers.find(c => c.id === form.carrier_id)

  const validateStep = () => {
    const errs: typeof errors = {}
    if (step === 1 && !form.carrier_id) errs.carrier_id = 'Select a carrier'
    if (step === 2) {
      if (!form.client_name.trim()) errs.client_name = 'Client name is required'
      if (!form.ghl_contact_id.trim()) errs.ghl_contact_id = 'Contact ID is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => { if (validateStep()) setStep(s => s + 1) }
  const back = () => setStep(s => s - 1)

  const handleSubmit = () => {
    if (!validateStep()) return
    startTransition(async () => {
      try {
        const result = await submitVCC({
          ghl_contact_id: form.ghl_contact_id,
          carrier: selectedCarrier?.carrier ?? form.carrier_id,
          form_template_id: form.carrier_id,
          client_name: form.client_name,
          client_dob: form.client_dob || undefined,
          medicare_id: form.medicare_id || undefined,
          doctor_name: form.doctor_name || undefined,
          doctor_fax: form.doctor_fax || undefined,
          broker_npn: form.broker_npn || undefined,
          send_fax: form.send_fax,
        })
        toast({
          title: 'VCC Form submitted successfully',
          description: form.send_fax && form.doctor_fax
            ? `Fax ${result.faxStatus === 'sent' ? 'sent' : 'queued'} to ${form.doctor_fax}`
            : 'PDF generated and ready for download',
        })
        router.push('/dashboard/vcc')
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Submission failed', description: err.message })
      }
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-border px-8 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest">
          <Link href="/dashboard/vcc"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Link>
        </Button>
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span className="text-[11px] font-black uppercase tracking-widest">New VCC submission</span>
        </div>
      </header>

      {/* Step indicator */}
      <div className="px-8 py-4 border-b border-border">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          {STEPS.map((label, i) => {
            const n = i + 1
            const active = n === step
            const done = n < step
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 transition-colors ${
                  done ? 'bg-primary text-white' : active ? 'bg-primary/20 text-primary border border-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {done ? <CheckCircle2 className="w-3 h-3" /> : n}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest hidden sm:block ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-2" />}
              </div>
            )
          })}
        </div>
      </div>

      <main className="flex-1 flex items-start justify-center p-8">
        <Card className="w-full max-w-2xl rounded-3xl border border-border shadow-sm p-8 space-y-6">

          {/* Step 1 -- Carrier */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">Select Carrier</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                  Choose the insurance carrier for this VCC Form
                </p>
              </div>
              {carriers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                  <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                    No carrier templates configured yet
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Upload PDF templates to the vcc-templates storage bucket to enable form filling.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {carriers.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setForm(f => ({ ...f, carrier_id: c.id })); setErrors({}) }}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        form.carrier_id === c.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40 hover:bg-muted/40'
                      }`}
                    >
                      <p className="font-black text-sm uppercase tracking-tight">{c.carrier_display_name}</p>
                      <p className="text-[9px] font-bold text-muted-foreground mt-0.5 uppercase">{c.year}</p>
                    </button>
                  ))}
                </div>
              )}
              <FieldError msg={errors.carrier_id} />
            </div>
          )}

          {/* Step 2 -- Client Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">Client Information</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                  Enter the beneficiary and physician details
                </p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Client Full Name *</Label>
                  <Input value={form.client_name} onChange={set('client_name')} placeholder="Jane Smith" className="h-12 rounded-2xl" />
                  <FieldError msg={errors.client_name} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Date of Birth</Label>
                    <Input value={form.client_dob} onChange={set('client_dob')} placeholder="MM/DD/YYYY" className="h-12 rounded-2xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Medicare ID (optional)</Label>
                    <Input value={form.medicare_id} onChange={set('medicare_id')} placeholder="1EG4-TE5-MK72" className="h-12 rounded-2xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Primary Doctor Name</Label>
                  <Input value={form.doctor_name} onChange={set('doctor_name')} placeholder="Dr. John Doe" className="h-12 rounded-2xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Doctor Fax Number</Label>
                  <Input value={form.doctor_fax} onChange={set('doctor_fax')} placeholder="(555) 000-0000" className="h-12 rounded-2xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest">GHL Contact ID *</Label>
                  <Input value={form.ghl_contact_id} onChange={set('ghl_contact_id')} placeholder="GHL contact identifier" className="h-12 rounded-2xl" />
                  <FieldError msg={errors.ghl_contact_id} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 -- Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">Review</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                  Confirm submission details before generating the PDF
                </p>
              </div>
              <div className="rounded-2xl bg-muted/40 border border-border p-5 space-y-3">
                {[
                  ['Carrier',      selectedCarrier?.carrier_display_name ?? form.carrier_id],
                  ['Client Name',  form.client_name],
                  ['Date of Birth', form.client_dob || '--'],
                  ['Doctor Name',  form.doctor_name || '--'],
                  ['Doctor Fax',   form.doctor_fax || '--'],
                  ['Medicare ID',  form.medicare_id ? '*** provided' : '--'],
                  ['Contact ID',   form.ghl_contact_id],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">{label}</span>
                    <span className="text-[11px] font-bold text-right">{value}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4">
                <p className="text-[10px] font-bold text-amber-700">
                  This submission creates a 60-day deadline. The filled PDF will be generated and stored securely.
                </p>
              </div>
            </div>
          )}

          {/* Step 4 -- Dispatch */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight">Choose Dispatch</h2>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                  How should the completed form be delivered to the physician?
                </p>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, send_fax: true }))}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${
                    form.send_fax ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <p className="font-black text-sm">Send fax to doctor automatically</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {form.doctor_fax ? `Fax to ${form.doctor_fax}` : 'Add a doctor fax number in Step 2'}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, send_fax: false }))}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${
                    !form.send_fax ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <p className="font-black text-sm">I will send manually (download PDF)</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">PDF saved to your secure storage for download</p>
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            {step > 1 ? (
              <Button variant="outline" onClick={back} className="rounded-2xl font-black uppercase text-[10px] tracking-widest h-11 px-5">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : (
              <div />
            )}
            {step < 4 ? (
              <Button onClick={next} disabled={step === 1 && carriers.length === 0}
                className="rounded-2xl font-black uppercase text-[10px] tracking-widest h-11 px-5">
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isPending}
                className="rounded-2xl font-black uppercase text-[10px] tracking-widest h-11 px-6">
                {isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                {isPending ? 'Submitting...' : 'Submit VCC Form'}
              </Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  )
}
