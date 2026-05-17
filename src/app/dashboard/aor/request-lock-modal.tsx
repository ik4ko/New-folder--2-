'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Lock, Mail, MessageSquare, Upload, Users, Loader2, CheckCircle2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createAORSubmission } from '@/app/actions/aor'
import type { SignatureMethod } from '@/app/actions/aor'
import { createClient } from '@/lib/supabase/client'

interface Contact {
  id: string
  ghl_contact_id: string
  full_name: string | null
  email: string | null
  phone: string | null
  current_plan_id: string | null
}

const SIGNATURE_METHODS: Array<{
  value: SignatureMethod
  label: string
  description: string
  icon: React.ElementType
}> = [
  { value: 'email_link',    label: 'Email Link',  description: 'Send signing link via email',        icon: Mail },
  { value: 'sms_link',      label: 'SMS Link',    description: 'Send signing link via text message', icon: MessageSquare },
  { value: 'manual_upload', label: "I'll Upload",  description: 'Print, sign, and upload PDF',        icon: Upload },
  { value: 'in_person',     label: 'In Person',   description: 'Sign together at next meeting',      icon: Users },
]

export function RequestLockModal() {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactId, setContactId] = useState('')
  const [carrier, setCarrier] = useState('')
  const [carrierFax, setCarrierFax] = useState('')
  const [method, setMethod] = useState<SignatureMethod>('email_link')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: broker } = await supabase
        .from('brokers').select('agency_id').eq('user_id', user.id).maybeSingle()
      if (!broker) return
      const { data: rows } = await supabase
        .from('ghl_contacts')
        .select('id, ghl_contact_id, full_name, email, phone, current_plan_id')
        .eq('agency_id', broker.agency_id)
        .not('aor_status', 'eq', 'locked')
        .order('full_name')
        .limit(200)
      setContacts(rows ?? [])
    })
  }, [open])

  const selectedContact = contacts.find(c => c.ghl_contact_id === contactId)

  function handleSubmit() {
    if (!contactId) { setError('Please select a client'); return }
    if (!carrier.trim()) { setError('Please enter the carrier name'); return }
    setError('')

    startTransition(async () => {
      const result = await createAORSubmission({
        ghlContactId: contactId,
        clientName: selectedContact?.full_name ?? 'Unknown',
        clientEmail: selectedContact?.email ?? undefined,
        clientPhone: selectedContact?.phone ?? undefined,
        carrier: carrier.trim(),
        carrierFax: carrierFax.trim() || undefined,
        signatureMethod: method,
      })

      if (result.error) {
        toast({ variant: 'destructive', title: 'Failed', description: result.error })
        return
      }

      toast({
        title: 'AOR request submitted',
        description: method === 'email_link'
          ? `Signing link sent to ${selectedContact?.email ?? 'client'}`
          : method === 'sms_link'
          ? `Signing link sent via SMS`
          : method === 'manual_upload'
          ? 'PDF prepared — upload the signed copy when ready'
          : 'AOR prepared for in-person signing',
      })
      setOpen(false)
      setContactId('')
      setCarrier('')
      setCarrierFax('')
      setMethod('email_link')
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl h-9 font-black uppercase tracking-widest text-[10px] gap-2">
          <Lock className="w-4 h-4" /> Request Lock
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-3xl border-slate-800 bg-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-black uppercase tracking-tight text-sm text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" /> Request AOR Lock
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Client select */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client *</Label>
            <Select value={contactId} onValueChange={v => { setContactId(v); setError('') }}>
              <SelectTrigger className="h-10 rounded-xl bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 max-h-56">
                {contacts.length === 0 ? (
                  <SelectItem value="_empty" disabled>No eligible clients</SelectItem>
                ) : contacts.map(c => (
                  <SelectItem key={c.ghl_contact_id} value={c.ghl_contact_id} className="text-white hover:bg-slate-800">
                    <div>
                      <span className="font-bold">{c.full_name ?? 'Unknown'}</span>
                      {c.current_plan_id && (
                        <span className="text-slate-400 ml-2 text-[10px]">{c.current_plan_id}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Carrier */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carrier *</Label>
              <Input
                value={carrier}
                onChange={e => { setCarrier(e.target.value); setError('') }}
                placeholder="e.g. Humana"
                className="h-10 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carrier Fax</Label>
              <Input
                value={carrierFax}
                onChange={e => setCarrierFax(e.target.value)}
                placeholder="(555) 000-0000"
                className="h-10 rounded-xl bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Signature method */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Signature Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {SIGNATURE_METHODS.map(m => {
                const Icon = m.icon
                const selected = method === m.value
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${selected ? 'text-primary' : 'text-slate-400'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${selected ? 'text-primary' : 'text-slate-300'}`}>
                        {m.label}
                      </span>
                      {selected && <CheckCircle2 className="w-3 h-3 text-primary ml-auto" />}
                    </div>
                    <p className="text-[9px] text-slate-500 leading-tight">{m.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <p className="text-[10px] font-bold text-red-400">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {isPending ? 'Submitting...' : 'Submit AOR Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
