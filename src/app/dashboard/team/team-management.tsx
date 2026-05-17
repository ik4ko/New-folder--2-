'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Trash2, RefreshCw, Users, ShieldCheck, CheckCircle2, AlertCircle, Clock, Send } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Broker {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string | null
  role: string
  npn: string | null
  created_at: string
  assignedCount: number
}

interface PendingInvite {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
}

interface Props {
  brokers: Broker[]
  agencyId: string
  isOwner: boolean
  pendingInvites: PendingInvite[]
}

function parseEmails(raw: string): string[] {
  return [...new Set(
    raw.split(/[\n,]+/)
      .map(s => s.trim().toLowerCase())
      .filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
  )]
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function isExpired(expires_at: string) {
  return new Date(expires_at) < new Date()
}

export function TeamManagement({ brokers: initial, agencyId, isOwner, pendingInvites: initialInvites }: Props) {
  const [brokers, setBrokers] = useState<Broker[]>(initial)
  const [invites, setInvites] = useState<PendingInvite[]>(initialInvites)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const [role, setRole] = useState<'broker' | 'agency_admin' | 'customer_service'>('broker')
  const [bulkText, setBulkText] = useState('')
  const [singleForm, setSingleForm] = useState({ email: '', first_name: '', last_name: '', npn: '' })
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [results, setResults] = useState<Array<{ email: string; ok: boolean; reason?: string }>>([])

  const parsedEmails = parseEmails(bulkText)

  const sendInvite = async (email: string, first_name: string, last_name: string) => {
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, first_name, last_name, role, agency_id: agencyId }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Invite failed')
    return json.broker
  }

  const handleBulkInvite = async () => {
    if (parsedEmails.length === 0) {
      toast({ title: 'No valid emails', description: 'Enter at least one valid email address.', variant: 'destructive' })
      return
    }
    setSending(true)
    setProgress({ done: 0, total: parsedEmails.length })
    setResults([])

    const newResults: typeof results = []
    let done = 0
    for (const email of parsedEmails) {
      try {
        const broker = await sendInvite(email, email.split('@')[0], '')
        newResults.push({ email, ok: true })
        if (broker) setBrokers(prev => [broker, ...prev])
      } catch (e: any) {
        newResults.push({ email, ok: false, reason: e.message })
      }
      done++
      setProgress({ done, total: parsedEmails.length })
    }
    setResults(newResults)
    setSending(false)
    setProgress(null)

    const successes = newResults.filter(r => r.ok).length
    if (successes > 0) {
      toast({ title: `${successes} invite${successes > 1 ? 's' : ''} sent` })
    }
    if (successes === parsedEmails.length) {
      setBulkText('')
      setTimeout(() => { setResults([]); setInviteOpen(false) }, 2000)
    }
  }

  const handleSingleInvite = async () => {
    if (!singleForm.email || !singleForm.first_name || !singleForm.last_name) {
      toast({ title: 'Missing fields', description: 'Email, first name, and last name are required.', variant: 'destructive' })
      return
    }
    setSending(true)
    try {
      const broker = await sendInvite(singleForm.email, singleForm.first_name, singleForm.last_name)
      if (broker) setBrokers(prev => [broker, ...prev])
      toast({ title: 'Invite sent', description: `${singleForm.first_name} ${singleForm.last_name} will receive an email to join.` })
      setSingleForm({ email: '', first_name: '', last_name: '', npn: '' })
      setInviteOpen(false)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleRemove = async (broker: Broker) => {
    if (!confirm(`Remove ${broker.first_name} ${broker.last_name}? Their assigned contacts will be unassigned.`)) return
    setRemoving(broker.id)
    try {
      const res = await fetch(`/api/team/remove?brokerId=${broker.id}`, { method: 'DELETE' })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Remove failed') }
      setBrokers(prev => prev.filter(b => b.id !== broker.id))
      toast({ title: 'Broker removed' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setRemoving(null)
    }
  }

  const handleResendInvite = async (invite: PendingInvite) => {
    setSending(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invite.email, first_name: invite.email.split('@')[0], last_name: '', role: invite.role, agency_id: agencyId }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Resend failed') }
      toast({ title: 'Invite resent', description: `Re-sent invite to ${invite.email}` })
      // Update expires_at optimistically
      const newExpires = new Date(Date.now() + 7 * 86400000).toISOString()
      setInvites(prev => prev.map(i => i.id === invite.id ? { ...i, expires_at: newExpires } : i))
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-tight">Your Team</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {brokers.length} member{brokers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <Dialog open={inviteOpen} onOpenChange={open => { setInviteOpen(open); if (!open) setResults([]) }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-9 font-black uppercase tracking-widest text-[10px] gap-2">
              <UserPlus className="w-4 h-4" /> Invite Team Members
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl border-slate-800 bg-slate-900 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-black uppercase tracking-tight text-sm text-white">Invite Team Members</DialogTitle>
            </DialogHeader>

            {/* Role selector */}
            <div className="flex gap-2 pb-2">
              {([['broker', 'Broker'], ['customer_service', 'Customer Service'], ['agency_admin', 'Manager']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setRole(val)}
                  className={`flex-1 py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${role === val ? 'border-primary bg-primary/10 text-primary' : 'border-slate-700 text-slate-400 hover:border-primary/40'}`}>
                  {label}
                </button>
              ))}
            </div>

            <Tabs defaultValue="bulk">
              <TabsList className="w-full rounded-xl mb-4 bg-slate-800">
                <TabsTrigger value="bulk" className="flex-1 rounded-lg font-black uppercase text-[10px] tracking-widest">Bulk Invite</TabsTrigger>
                <TabsTrigger value="single" className="flex-1 rounded-lg font-black uppercase text-[10px] tracking-widest">Single Invite</TabsTrigger>
              </TabsList>

              <TabsContent value="bulk" className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Addresses</Label>
                  <textarea
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    rows={5}
                    placeholder={"Paste emails, one per line or comma-separated\njohn@example.com\njane@example.com, bob@example.com"}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 text-slate-200 px-3 py-2.5 text-xs font-medium resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-slate-600"
                  />
                  {bulkText.trim() && (
                    <p className="text-[10px] font-black">
                      {parsedEmails.length > 0 ? (
                        <span className="text-primary">{parsedEmails.length} invite{parsedEmails.length !== 1 ? 's' : ''} will be sent</span>
                      ) : <span className="text-slate-500">No valid emails detected</span>}
                    </p>
                  )}
                </div>

                {progress && (
                  <div className="rounded-xl bg-slate-800 border border-slate-700 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Sending... ({progress.done}/{progress.total})
                    </p>
                    <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                    </div>
                  </div>
                )}
                {results.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {results.map(r => (
                      <div key={r.email} className="flex items-center gap-2 text-[10px] font-medium">
                        {r.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />}
                        <span className={r.ok ? 'text-slate-200' : 'text-red-400'}>{r.email}</span>
                        {!r.ok && <span className="text-slate-500">-- {r.reason}</span>}
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={handleBulkInvite} disabled={sending || parsedEmails.length === 0}
                  className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px]">
                  {sending
                    ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Sending {progress?.done ?? 0}/{progress?.total ?? 0}...</>
                    : <><UserPlus className="w-4 h-4 mr-2" /> Send {parsedEmails.length || ''} Invite{parsedEmails.length !== 1 ? 's' : ''}</>}
                </Button>
              </TabsContent>

              <TabsContent value="single" className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-300">First Name *</Label>
                    <Input placeholder="Jane" value={singleForm.first_name}
                      onChange={e => setSingleForm(f => ({ ...f, first_name: e.target.value }))}
                      className="rounded-xl h-10 text-xs font-bold bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Last Name *</Label>
                    <Input placeholder="Smith" value={singleForm.last_name}
                      onChange={e => setSingleForm(f => ({ ...f, last_name: e.target.value }))}
                      className="rounded-xl h-10 text-xs font-bold bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Email Address *</Label>
                  <Input type="email" placeholder="jane@agency.com" value={singleForm.email}
                    onChange={e => setSingleForm(f => ({ ...f, email: e.target.value }))}
                    className="rounded-xl h-10 text-xs font-bold bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-300">NPN (Optional)</Label>
                  <Input placeholder="12345678" value={singleForm.npn}
                    onChange={e => setSingleForm(f => ({ ...f, npn: e.target.value }))}
                    className="rounded-xl h-10 text-xs font-bold bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
                <Button onClick={handleSingleInvite} disabled={sending}
                  className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px]">
                  {sending ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><UserPlus className="w-4 h-4 mr-2" /> Send Invite</>}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6 pb-32">
        {/* Seat counter */}
        {(() => {
          const INCLUDED = 5
          const used = brokers.length + 1 // +1 for owner
          const additional = Math.max(0, used - INCLUDED)
          return (
            <Card className="rounded-2xl border-slate-800 bg-slate-900/60">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Seats Used</p>
                    <p className="text-2xl font-black text-white">
                      {used} <span className="text-slate-500 text-base font-bold">/ {INCLUDED} included</span>
                    </p>
                  </div>
                </div>
                {additional > 0 && (
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">+{additional} additional</p>
                    <p className="text-[10px] text-slate-500 font-medium">${additional * 30}/mo</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })()}

        {/* Role stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: ShieldCheck, label: 'Managers', value: brokers.filter(b => b.role === 'agency_admin').length, color: 'text-blue-400 bg-blue-500/10' },
            { icon: Users, label: 'CS Staff', value: brokers.filter(b => b.role === 'customer_service').length, color: 'text-violet-400 bg-violet-500/10' },
            { icon: Users, label: 'Brokers', value: brokers.filter(b => b.role === 'broker' || b.role === 'solo_broker').length, color: 'text-slate-400 bg-slate-800' },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="rounded-2xl border-slate-800 bg-slate-900/60">
              <CardContent className="p-5 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                  <p className="text-2xl font-black text-white">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Broker table */}
        <Card className="rounded-3xl border border-slate-800 bg-slate-900/60 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-sm font-black uppercase tracking-tight text-white">Broker Roster</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {brokers.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No brokers yet. Invite your first broker above.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-none hover:bg-transparent bg-transparent border-slate-800">
                    {['Name', 'Role', 'Email', 'Clients', 'Joined', 'Actions'].map(h => (
                      <TableHead key={h} className="font-black uppercase tracking-widest text-[9px] py-4 px-6 text-slate-500">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brokers.map(broker => (
                    <TableRow key={broker.id} className="border-slate-800 hover:bg-slate-800/40">
                      <TableCell className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-200">{broker.first_name} {broker.last_name}</p>
                        {broker.npn && <p className="text-[9px] text-slate-500 font-mono">NPN: {broker.npn}</p>}
                      </TableCell>
                      <TableCell>
                        {broker.role === 'agency_owner' && (
                          <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[8px] font-black uppercase">Owner</Badge>
                        )}
                        {broker.role === 'agency_admin' && (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[8px] font-black uppercase">Manager</Badge>
                        )}
                        {broker.role === 'customer_service' && (
                          <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[8px] font-black uppercase">CS</Badge>
                        )}
                        {broker.role === 'broker' && (
                          <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[8px] font-black uppercase">Broker</Badge>
                        )}
                        {broker.role === 'solo_broker' && (
                          <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[8px] font-black uppercase">Solo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">{broker.email ?? '--'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-black border-slate-700 text-slate-300">{broker.assignedCount}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">{fmtDate(broker.created_at)}</TableCell>
                      <TableCell>
                        {isOwner && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-slate-500"
                            disabled={removing === broker.id} onClick={() => handleRemove(broker)}>
                            {removing === broker.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <Card className="rounded-3xl border border-slate-800 bg-slate-900/60 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Pending Invitations
                <Badge className="ml-1 text-[8px] font-black bg-amber-500/10 text-amber-400 border-amber-500/20 border">
                  {invites.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-none hover:bg-transparent bg-transparent border-slate-800">
                    {['Email', 'Role', 'Sent', 'Expires', ''].map(h => (
                      <TableHead key={h} className="font-black uppercase tracking-widest text-[9px] py-4 px-6 text-slate-500">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map(invite => {
                    const expired = isExpired(invite.expires_at)
                    return (
                      <TableRow key={invite.id} className={`border-slate-800 hover:bg-slate-800/40 ${expired ? 'opacity-50' : ''}`}>
                        <TableCell className="px-6 py-3 text-sm text-slate-300">{invite.email}</TableCell>
                        <TableCell>
                          {invite.role === 'agency_admin' && (
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[8px] font-black uppercase">Manager</Badge>
                          )}
                          {invite.role === 'customer_service' && (
                            <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[8px] font-black uppercase">CS</Badge>
                          )}
                          {invite.role === 'broker' && (
                            <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[8px] font-black uppercase">Broker</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-500">{fmtDate(invite.created_at)}</TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-bold ${expired ? 'text-red-400' : 'text-slate-400'}`}>
                            {expired ? 'Expired' : fmtDate(invite.expires_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" disabled={sending}
                            onClick={() => handleResendInvite(invite)}
                            className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 gap-1.5">
                            <Send className="w-3 h-3" />
                            {expired ? 'Re-invite' : 'Resend'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
