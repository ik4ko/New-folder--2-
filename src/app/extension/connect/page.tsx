'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Logo } from '@/components/logo'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'

type State = 'loading' | 'not-logged-in' | 'ready' | 'connecting' | 'connected' | 'no_extension' | 'error'

export default function ExtensionConnectPage() {
  const [state, setState] = useState<State>('loading')
  const [brokerName, setBrokerName] = useState('')
  const [agency, setAgency] = useState('')
  const [error, setError] = useState('')
  // Set true as soon as the extension's content-script bridge announces itself.
  const [extPresent, setExtPresent] = useState(false)

  // ID-independent handshake: the content-script bridge posts
  // AEGISSAGE_EXT_PRESENT on load and in reply to our PING, so we detect the
  // extension regardless of its (unpacked, random) ID — no hardcoded EXT_ID.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window) return
      const data = event.data
      if (!data || data.source !== 'aegissage-ext') return
      if (data.type === 'AEGISSAGE_EXT_PRESENT') setExtPresent(true)
    }
    window.addEventListener('message', onMessage)
    // Ask an already-loaded bridge to announce (covers page-loads-after-bridge).
    window.postMessage({ source: 'aegissage-page', type: 'AEGISSAGE_PING' }, '*')
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch('/api/extension/connect')
      if (res.status === 401) {
        window.location.href = '/login?redirect=' + encodeURIComponent('/extension/connect')
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Server error ${res.status}`)
        setState('error')
        return
      }
      const data = await res.json()
      setBrokerName(data.broker_name ?? data.user_email ?? '')
      setAgency(data.agency ?? '')
      setState('ready')
    } catch (err: any) {
      setError(err.message)
      setState('error')
    }
  }

  // Send the token to the content-script bridge via postMessage and wait for
  // its ack. Resolves true on confirmed store, false on timeout (no bridge).
  function sendTokenToExtension(token: string): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false
      function onAck(event: MessageEvent) {
        if (event.source !== window) return
        const data = event.data
        if (!data || data.source !== 'aegissage-ext') return
        if (data.type === 'AEGISSAGE_TOKEN_STORED') {
          if (settled) return
          settled = true
          window.removeEventListener('message', onAck)
          resolve(data.success !== false)
        }
      }
      window.addEventListener('message', onAck)
      // localStorage fallback covers a bridge that injects after this post.
      try { localStorage.setItem('aegissage_pending_token', JSON.stringify({ token })) } catch {}
      window.postMessage({ source: 'aegissage-page', type: 'AEGISSAGE_TOKEN', token }, '*')
      setTimeout(() => {
        if (settled) return
        settled = true
        window.removeEventListener('message', onAck)
        resolve(false)
      }, 4000)
    })
  }

  async function handleConnect() {
    setState('connecting')
    try {
      const res = await fetch('/api/extension/connect')
      if (res.status === 401) {
        window.location.href = '/login?redirect=' + encodeURIComponent('/extension/connect')
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      const { token } = await res.json()
      if (!token) throw new Error('No active session — please log in again')

      const stored = await sendTokenToExtension(token)
      if (stored) {
        setState('connected')
        setTimeout(() => { window.location.href = '/dashboard' }, 1500)
      } else {
        // No bridge acked — extension isn't installed (or needs a reload).
        setState('no_extension')
      }
    } catch (err: any) {
      setError(err.message)
      setState('error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <Logo />
          <h1 className="text-2xl font-black uppercase tracking-tight text-white mt-4">
            Connect Extension
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Link the AegisSage Chrome extension to your account to sync carrier rosters with one click.
          </p>
        </div>

        <Card className="rounded-3xl border-slate-800 bg-slate-900/60 p-8">
          {state === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-slate-400 text-sm">Checking your account...</p>
            </div>
          )}

          {state === 'not-logged-in' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-400 text-sm font-bold text-center">
                  You need to log in to connect the extension.
                </p>
              </div>
              <Button asChild className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs">
                <Link href="/login?redirect=/extension/connect">Log In to AegisSage</Link>
              </Button>
            </div>
          )}

          {state === 'ready' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Connecting as</p>
                <p className="text-white font-black text-base">{brokerName}</p>
                {agency && <p className="text-slate-400 text-sm font-medium">{agency}</p>}
              </div>
              <div className="space-y-2">
                {[
                  'Sync rosters from Humana, Clover, and more',
                  'One-click sync from any carrier portal',
                  'Alerts fire automatically after each sync',
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-slate-300 text-sm font-medium">{feat}</p>
                  </div>
                ))}
              </div>
              <div className={`flex items-center gap-2 justify-center rounded-xl px-3 py-2 text-[11px] font-bold ${
                extPresent
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${extPresent ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {extPresent ? 'Extension detected' : 'Extension not detected yet'}
              </div>
              <Button
                onClick={handleConnect}
                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {extPresent ? 'Connect Extension' : 'Connect (or install below)'}
              </Button>
            </div>
          )}

          {state === 'connecting' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-slate-300 font-bold text-sm">Connecting your account...</p>
            </div>
          )}

          {state === 'connected' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-center">
                <div className="text-4xl mb-4">✓</div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Extension Connected
                </h2>
                <p className="text-gray-400 text-sm">
                  Redirecting to your dashboard...
                </p>
              </div>
              <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
              <Button asChild variant="ghost" size="sm"
                className="text-slate-500 hover:text-slate-300 text-xs">
                <Link href="/dashboard">Go now →</Link>
              </Button>
            </div>
          )}

          {state === 'no_extension' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-amber-400 text-sm font-bold">Extension not detected</p>
                  <p className="text-amber-300/70 text-xs font-medium">
                    Our Chrome extension is pending Web Store review. Install it manually in under 60 seconds.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  'Download the extension file below',
                  'Go to chrome://extensions in your browser',
                  'Toggle Developer Mode ON (top right)',
                  'Click "Load unpacked" and select the unzipped folder',
                  'Click the puzzle icon in Chrome toolbar → pin AegisSage',
                  'Click the extension icon → Connect Account',
                ].map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-slate-300">{step}</p>
                  </div>
                ))}
              </div>
              <a
                href="/aegissage-extension.zip"
                download
                className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors"
              >
                Download Extension
              </a>
              <p className="text-center text-xs text-slate-600">
                Chrome Web Store listing pending review. We&apos;ll notify you when available for one-click install.
              </p>
              <Button onClick={() => { setState('loading'); checkAuth() }} variant="outline"
                className="w-full h-10 rounded-2xl font-black uppercase tracking-widest text-xs border-slate-700">
                Try Again After Installing
              </Button>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm font-bold">{error}</p>
              </div>
              <Button onClick={() => { setState('loading'); checkAuth() }} variant="outline"
                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs border-slate-700">
                Try Again
              </Button>
            </div>
          )}
        </Card>

        <p className="text-center text-[10px] text-slate-600 font-medium">
          Your credentials are never stored in the extension.{' '}
          <Link href="/privacy" className="text-slate-500 hover:text-slate-400">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
