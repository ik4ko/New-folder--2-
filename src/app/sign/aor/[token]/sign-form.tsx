'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { clientSignAOR } from '@/app/actions/aor'
import { CheckCircle2, Loader2, PenLine } from 'lucide-react'

interface Props {
  token: string
  brokerName: string
  carrier: string
}

export function AORSignForm({ token, brokerName, carrier }: Props) {
  const [name, setName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Please type your full legal name to sign.'); return }
    if (!agreed) { setError('You must check the agreement box to proceed.'); return }
    setError(null)

    startTransition(async () => {
      const result = await clientSignAOR(token, name.trim())
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  if (success) {
    return (
      <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-8 flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight text-emerald-800">Signed Successfully</h3>
          <p className="text-sm text-emerald-700 mt-2 leading-relaxed">
            Your broker has been notified. A copy of the Appointment of Representative form will
            be sent to {carrier} on your behalf. No further action is needed from you.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
          <PenLine className="w-3.5 h-3.5" /> Type your full legal name to sign
        </Label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Margaret Johnson"
          className="h-14 rounded-2xl text-base border-2 focus:border-primary"
          disabled={isPending}
          autoComplete="name"
        />
        <p className="text-[10px] text-muted-foreground font-medium">
          Type exactly as it appears on your Medicare card
        </p>
      </div>

      <div className="rounded-2xl border border-border p-4 flex items-start gap-3">
        <Checkbox
          id="agree"
          checked={agreed}
          onCheckedChange={v => setAgreed(v === true)}
          className="mt-0.5 shrink-0"
          disabled={isPending}
        />
        <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer font-medium">
          I understand and agree to appoint <strong>{brokerName}</strong> as my Medicare
          representative. I confirm this is my voluntary decision and I am the person named above.
        </Label>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm font-bold text-red-700">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending || !name.trim() || !agreed}
        className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg bg-primary hover:bg-primary/90"
      >
        {isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Signing...</>
        ) : (
          <><PenLine className="w-4 h-4 mr-2" /> Sign Document</>
        )}
      </Button>

      <p className="text-center text-[10px] text-muted-foreground/60 font-medium">
        This signature is legally binding. By signing you acknowledge that you have read
        and understood the Appointment of Representative form.
      </p>
    </form>
  )
}
