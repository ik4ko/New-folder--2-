'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { sendAORToClient, brokerSignAndFax, uploadSignedAOR } from '@/app/actions/aor'
import { Loader2, Send, PenLine, Lock, RefreshCw, Upload } from 'lucide-react'
import type { AORSubmission } from '@/app/actions/aor'

interface Props {
  submission: AORSubmission
}

export function AORRowActions({ submission: sub }: Props) {
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handle(fn: () => Promise<{ success?: boolean; error?: string; faxConfirmationId?: string }>, successMsg: string) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) {
        toast({ variant: 'destructive', title: 'Error', description: res.error })
      } else {
        toast({ title: successMsg })
        router.refresh()
      }
    })
  }

  function handleUpload() {
    if (!uploadFile) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('file', uploadFile)
      const res = await uploadSignedAOR(sub.id, fd)
      if (res.error) {
        toast({ variant: 'destructive', title: 'Upload failed', description: res.error })
      } else {
        toast({ title: 'AOR Locked', description: 'Signed copy uploaded and faxed to carrier.' })
        router.refresh()
      }
    })
  }

  if (sub.status === 'prepared') {
    return (
      <Button size="sm" variant="outline" disabled={isPending}
        className="h-7 rounded-xl font-black uppercase text-[9px] tracking-widest gap-1"
        onClick={() => handle(() => sendAORToClient(sub.id), 'Link sent to client')}>
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        Send to Client
      </Button>
    )
  }

  if (sub.status === 'client_sent') {
    const isManual = sub.signature_method === 'manual_upload' || sub.signature_method === 'in_person'

    if (isManual) {
      return (
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
          />
          {uploadFile ? (
            <Button size="sm" disabled={isPending}
              className="h-7 rounded-xl font-black uppercase text-[9px] tracking-widest gap-1 bg-emerald-600"
              onClick={handleUpload}>
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
              {isPending ? 'Uploading...' : 'Submit'}
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={isPending}
              className="h-7 rounded-xl font-black uppercase text-[9px] tracking-widest gap-1"
              onClick={() => fileRef.current?.click()}>
              <Upload className="w-3 h-3" /> Upload Signed PDF
            </Button>
          )}
          {uploadFile && (
            <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">{uploadFile.name}</span>
          )}
        </div>
      )
    }

    return (
      <Button size="sm" variant="ghost" disabled={isPending}
        className="h-7 rounded-xl font-black uppercase text-[9px] tracking-widest gap-1 text-amber-600"
        onClick={() => handle(() => sendAORToClient(sub.id), 'Link resent to client')}>
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        Resend Link
      </Button>
    )
  }

  if (sub.status === 'client_signed') {
    return (
      <Button size="sm" disabled={isPending}
        className="h-7 rounded-xl font-black uppercase text-[9px] tracking-widest gap-1 bg-primary"
        onClick={() => handle(() => brokerSignAndFax(sub.id), 'Signed & faxed to carrier')}>
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
        Counter-Sign & Fax
      </Button>
    )
  }

  if (sub.status === 'faxed' || sub.status === 'confirmed') {
    return (
      <div className="flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Locked</span>
      </div>
    )
  }

  if (sub.status === 'broker_signed') {
    return (
      <Button size="sm" variant="outline" disabled={isPending}
        className="h-7 rounded-xl font-black uppercase text-[9px] tracking-widest gap-1"
        onClick={() => handle(() => brokerSignAndFax(sub.id), 'Fax sent to carrier')}>
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
        Retry Fax
      </Button>
    )
  }

  return <span className="text-xs text-muted-foreground/50">--</span>
}
