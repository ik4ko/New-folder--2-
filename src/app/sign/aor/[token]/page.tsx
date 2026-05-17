import { createServiceClient } from '@/lib/supabase/service'
import { Logo } from '@/components/logo'
import { AORSignForm } from './sign-form'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ token: string }>
}

export default async function AORSignPage({ params }: Props) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: sub } = await supabase
    .from('aor_submissions')
    .select('id, client_name, broker_name, broker_npn, carrier, status, client_signature_token_expires_at, client_signed_at')
    .eq('client_signature_token', token)
    .maybeSingle()

  // Invalid token
  if (!sub) {
    return <ErrorPage icon="invalid" title="Invalid Link" desc="This signing link is invalid or has already been used. Please contact your broker for assistance." />
  }

  // Expired
  const expiry = sub.client_signature_token_expires_at ? new Date(sub.client_signature_token_expires_at) : null
  if (!expiry || expiry < new Date()) {
    return <ErrorPage icon="expired" title="Link Expired" desc="This signing link has expired. Contact your broker to request a new link." />
  }

  // Already signed
  if (sub.status === 'client_signed' || sub.status === 'broker_signed' || sub.status === 'faxed' || sub.status === 'confirmed') {
    return (
      <Page>
        <div className="flex flex-col items-center gap-6 text-center py-16">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Already Signed</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              This document was signed on {sub.client_signed_at ? new Date(sub.client_signed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'a prior date'}.
              Your broker will handle the next steps.
            </p>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
            <Clock className="w-3 h-3" />
            Expires {expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {expiry.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">
            Medicare Appointment of Representative
          </h1>
          <p className="text-sm text-muted-foreground font-medium">CMS Form 1696 -- Federal Document</p>
        </div>

        {/* Plain-language explanation */}
        <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6 space-y-3">
          <h2 className="font-black uppercase tracking-tight text-sm">What you are signing</h2>
          <p className="text-sm leading-relaxed text-slate-700">
            By signing below, you are authorizing <strong>{sub.broker_name}</strong>
            {sub.broker_npn ? ` (NPN: ${sub.broker_npn})` : ''} to act as your representative
            with Medicare and your health plan. This allows your broker to speak on your behalf,
            help resolve issues, and ensure your benefits stay active.
          </p>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
              This does NOT give your broker power over your medical decisions.
            </p>
          </div>
        </div>

        {/* Pre-filled details */}
        <div className="rounded-3xl border border-border p-6 space-y-3">
          <h2 className="font-black uppercase tracking-tight text-sm text-muted-foreground">Document Details</h2>
          <div className="space-y-2">
            {[
              { label: 'Your Name', value: sub.client_name },
              { label: 'Your Broker', value: sub.broker_name },
              { label: 'Carrier / Plan', value: sub.carrier },
              { label: 'Date', value: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
                <span className="text-sm font-bold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signature form (client component) */}
        <AORSignForm token={token} brokerName={sub.broker_name} carrier={sub.carrier} />
      </div>
    </Page>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b border-border/50 px-6 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <Link href="/">
          <Logo />
        </Link>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Secure Document Signing
        </span>
      </header>
      <main className="max-w-xl mx-auto py-12 px-6">
        {children}
      </main>
    </div>
  )
}

function ErrorPage({ icon, title, desc }: { icon: 'invalid' | 'expired'; title: string; desc: string }) {
  return (
    <Page>
      <div className="flex flex-col items-center gap-6 text-center py-16">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">{title}</h2>
          <p className="text-muted-foreground mt-2 text-sm max-w-sm">{desc}</p>
        </div>
      </div>
    </Page>
  )
}
