'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { CollectionSidebar } from '@/components/collection-sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, Loader2, AlertTriangle, GitBranch, TableProperties, Link2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { uploadRoster, routeMasterRoster, getAgencyBrokers } from '@/app/actions/roster-upload'
import type { UploadResult, RoutingResult, RoutedBroker, UnmatchedGroup } from '@/app/actions/roster-upload'
import type { RosterRow } from '@/lib/churn/roster-parser'

const CARRIERS = ['humana', 'uhc', 'aetna', 'wellcare', 'bcbs', 'cigna']

type Stage = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

interface Broker {
  id: string
  first_name: string
  last_name: string
  role: string
}

export default function RosterUploadPage() {
  const [carrier, setCarrier] = useState('')
  const [brokerId, setBrokerId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isMasterRoster, setIsMasterRoster] = useState(false)
  const [stage, setStage] = useState<Stage>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [routingResult, setRoutingResult] = useState<RoutingResult | null>(null)
  const [brokers, setBrokers] = useState<Broker[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Google Sheets import state
  const [sheetsUrl, setSheetsUrl] = useState('')
  const [sheetsLoading, setSheetsLoading] = useState(false)
  const [sheetsError, setSheetsError] = useState('')
  const [sheetsPreview, setSheetsPreview] = useState<{ rows: RosterRow[]; rowCount: number; csvBase64: string } | null>(null)

  useEffect(() => {
    getAgencyBrokers().then(setBrokers).catch(() => {})
  }, [])

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() { setIsDragging(false) }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && isValidFile(dropped)) setFile(dropped)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected && isValidFile(selected)) setFile(selected)
  }

  function isValidFile(f: File) {
    const ext = f.name.split('.').pop()?.toLowerCase()
    return ext === 'csv' || ext === 'xlsx' || ext === 'xls'
  }

  async function handleSubmit() {
    if (!carrier || !file) return
    setStage('uploading')

    const formData = new FormData()
    formData.set('carrier', carrier)
    formData.set('file', file)
    if (brokerId) formData.set('broker_id', brokerId)

    setStage('processing')

    if (isMasterRoster) {
      const res = await routeMasterRoster(formData)
      if (res.error) {
        setRoutingResult(res)
        setStage('error')
      } else {
        setRoutingResult(res)
        setStage('complete')
      }
    } else {
      const res = await uploadRoster(formData)
      if (res.error) {
        setResult(res)
        setStage('error')
      } else {
        setResult(res)
        setStage('complete')
      }
    }
  }

  function reset() {
    setFile(null)
    setStage('idle')
    setResult(null)
    setRoutingResult(null)
    setCarrier('')
    setBrokerId('')
    setIsMasterRoster(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSheetsPreview() {
    if (!carrier || !sheetsUrl) return
    setSheetsLoading(true)
    setSheetsError('')
    setSheetsPreview(null)
    try {
      const res = await fetch('/api/roster/sheets-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sheetsUrl, carrier }),
      })
      const data = await res.json()
      if (!res.ok) { setSheetsError(data.error ?? 'Preview failed'); return }
      setSheetsPreview({ rows: data.preview, rowCount: data.rowCount, csvBase64: data.csvBase64 })
    } catch (e: any) {
      setSheetsError(e.message)
    } finally {
      setSheetsLoading(false)
    }
  }

  async function handleSheetsConfirm() {
    if (!sheetsPreview || !carrier) return
    // Convert base64 CSV to File and run through existing uploadRoster action
    const binaryStr = atob(sheetsPreview.csvBase64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'text/csv' })
    const importFile = new File([blob], 'sheets_import.csv', { type: 'text/csv' })

    const formData = new FormData()
    formData.set('carrier', carrier)
    formData.set('file', importFile)
    if (brokerId) formData.set('broker_id', brokerId)

    setStage('processing')
    const res = await uploadRoster(formData)
    if (res.error) { setResult(res); setStage('error') }
    else { setResult(res); setStage('complete') }
    setSheetsPreview(null)
    setSheetsUrl('')
  }

  const canSubmit = carrier && file && stage === 'idle'

  return (
    <div className="flex h-full w-full bg-background">
      <CollectionSidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-border px-8 flex items-center gap-4 bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest">
            <Link href="/dashboard/churn"><ArrowLeft className="w-4 h-4 mr-1" /> Churn Monitor</Link>
          </Button>
          <span className="text-[11px] font-black uppercase tracking-widest text-foreground ml-2">Import Carrier Roster</span>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full pb-32 space-y-6">
          {stage === 'complete' && routingResult ? (
            <RoutingResultCard result={routingResult} brokers={brokers} onReset={reset} />
          ) : stage === 'complete' && result ? (
            <SingleResultCard result={result} onReset={reset} />
          ) : (stage === 'error') ? (
            <div className="space-y-4">
              <Card className="rounded-3xl border border-red-200 bg-red-500/5 shadow-sm">
                <CardContent className="p-6 flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight text-red-700">Import Failed</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{result?.error ?? routingResult?.error}</p>
                  </div>
                </CardContent>
              </Card>
              <Button onClick={reset} variant="outline" className="rounded-2xl font-black uppercase text-[10px] tracking-widest">Try Again</Button>
            </div>
          ) : (
            <>
              {/* Carrier selector */}
              <Card className="rounded-3xl border border-border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-sm font-black uppercase tracking-tight">1. Select Carrier</CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <Select value={carrier} onValueChange={setCarrier} disabled={stage !== 'idle'}>
                    <SelectTrigger className="rounded-2xl font-bold uppercase text-[11px] tracking-wide h-11">
                      <SelectValue placeholder="Choose carrier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CARRIERS.map(c => (
                        <SelectItem key={c} value={c} className="font-bold uppercase text-[11px]">{c.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Master roster toggle */}
              <Card className={`rounded-3xl border shadow-sm cursor-pointer transition-colors ${isMasterRoster ? 'border-primary bg-primary/5' : 'border-border'}`}
                onClick={() => stage === 'idle' && setIsMasterRoster(v => !v)}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isMasterRoster ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black uppercase tracking-tight">Master Roster Import</p>
                    <p className="text-[10px] text-muted-foreground">File includes agent NPN or broker name column -- auto-route to brokers</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 transition-colors flex items-center justify-center ${isMasterRoster ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                    {isMasterRoster && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </CardContent>
              </Card>

              {/* Broker selector (principal, single-roster mode) */}
              {brokers.length > 0 && !isMasterRoster && (
                <Card className="rounded-3xl border border-border shadow-sm">
                  <CardHeader className="border-b bg-muted/30">
                    <CardTitle className="text-sm font-black uppercase tracking-tight">
                      2. Attribute to Broker <span className="text-muted-foreground font-normal normal-case text-xs">(optional)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <Select value={brokerId} onValueChange={setBrokerId} disabled={stage !== 'idle'}>
                      <SelectTrigger className="rounded-2xl font-bold uppercase text-[11px] tracking-wide h-11">
                        <SelectValue placeholder="Select broker (or leave blank for yourself)..." />
                      </SelectTrigger>
                      <SelectContent>
                        {brokers.map(b => (
                          <SelectItem key={b.id} value={b.id} className="font-bold text-[11px]">
                            {b.first_name} {b.last_name}
                            <span className="text-muted-foreground ml-1 uppercase text-[9px]">({b.role})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              )}

              {/* File drop zone */}
              <Card className="rounded-3xl border border-border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-sm font-black uppercase tracking-tight">
                    {brokers.length > 0 && !isMasterRoster ? '3.' : '2.'} Import Roster File
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => stage === 'idle' && fileInputRef.current?.click()}
                    className={`
                      relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer
                      ${isDragging ? 'border-primary bg-primary/5' : file ? 'border-emerald-400 bg-emerald-500/5' : 'border-border bg-muted/20 hover:bg-muted/40'}
                      ${stage !== 'idle' ? 'pointer-events-none opacity-60' : ''}
                    `}
                  >
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileInput} />
                    {file ? (
                      <>
                        <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                        <p className="text-sm font-black text-foreground">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB -- click to change</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-muted-foreground/40" />
                        <p className="text-sm font-black uppercase tracking-tight text-muted-foreground">Drag & drop or click to select</p>
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">.CSV or .XLSX -- max 10 MB</p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Google Sheets Import */}
              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground shrink-0">Or import from Google Sheets</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Card className="rounded-3xl border border-border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                    <TableProperties className="w-4 h-4 text-primary" />
                    Google Sheets URL
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <p className="text-[10px] text-muted-foreground">
                    Paste a Google Sheets URL. The sheet must be set to <strong>Anyone with link can view</strong> in sharing settings.
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={sheetsUrl}
                        onChange={e => { setSheetsUrl(e.target.value); setSheetsError(''); setSheetsPreview(null) }}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        className="pl-8 h-10 rounded-xl text-sm"
                        disabled={stage !== 'idle'}
                      />
                    </div>
                    <Button
                      onClick={handleSheetsPreview}
                      disabled={!carrier || !sheetsUrl || sheetsLoading || stage !== 'idle'}
                      variant="outline"
                      className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 shrink-0 gap-1.5"
                    >
                      {sheetsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TableProperties className="w-3.5 h-3.5" />}
                      {sheetsLoading ? 'Fetching...' : 'Preview'}
                    </Button>
                  </div>

                  {sheetsError && (
                    <div className="flex items-start gap-2 text-red-600">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold">{sheetsError}</p>
                    </div>
                  )}

                  {sheetsPreview && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Preview — {sheetsPreview.rowCount} rows found
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-[10px]">
                          <thead className="bg-muted/50 border-b border-border">
                            <tr>
                              {['Name', 'Plan', 'Status', 'Member ID', 'DOB'].map(h => (
                                <th key={h} className="px-3 py-2 text-left font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sheetsPreview.rows.map((row, i) => (
                              <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                                <td className="px-3 py-2 font-medium">{row.full_name || '—'}</td>
                                <td className="px-3 py-2 text-muted-foreground">{row.plan_name || '—'}</td>
                                <td className="px-3 py-2 text-muted-foreground">{row.status || '—'}</td>
                                <td className="px-3 py-2 text-muted-foreground">{row.member_id || '—'}</td>
                                <td className="px-3 py-2 text-muted-foreground">{row.dob || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Button
                        onClick={handleSheetsConfirm}
                        disabled={stage !== 'idle'}
                        className="w-full h-10 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm Import ({sheetsPreview.rowCount} rows)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] gap-2"
              >
                {stage === 'uploading' || stage === 'processing' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {stage === 'uploading' ? 'Uploading...' : 'Processing...'}</>
                ) : (
                  <><Upload className="w-4 h-4" /> {isMasterRoster ? 'Route Master Roster' : 'Process Roster'}</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SingleResultCard({ result, onReset }: { result: UploadResult; onReset: () => void }) {
  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border border-emerald-200 bg-emerald-500/5 shadow-sm">
        <CardHeader className="border-b bg-emerald-500/5">
          <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Roster Processed
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-2 gap-4">
          {[
            { label: 'Rows Parsed', value: result.rowCount, cls: 'text-foreground' },
            { label: 'Matched in GHL', value: result.matched, cls: 'text-emerald-700' },
            { label: 'Missing (Switched?)', value: result.missing, cls: 'text-red-600' },
            { label: 'New Enrollments', value: result.new, cls: 'text-primary' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
              <span className={`text-3xl font-black tracking-tighter ${cls}`}>{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      {result.alertCount > 0 && (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] font-black uppercase px-3 py-1.5">
          {result.alertCount} alert{result.alertCount !== 1 ? 's' : ''} generated
        </Badge>
      )}
      <div className="flex gap-3">
        <Button asChild className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest h-11">
          <Link href="/dashboard/churn">View Alerts</Link>
        </Button>
        <Button onClick={onReset} variant="outline" className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest h-11">
          Import Another
        </Button>
      </div>
    </div>
  )
}

function RoutingResultCard({ result, brokers, onReset }: { result: RoutingResult; brokers: Broker[]; onReset: () => void }) {
  const [assignMap, setAssignMap] = useState<Record<string, string>>({})

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="rounded-3xl border border-emerald-200 bg-emerald-500/5 shadow-sm">
        <CardHeader className="border-b bg-emerald-500/5">
          <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-emerald-700">
            <GitBranch className="w-4 h-4" /> Master Roster Routed
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-3 gap-4">
          {[
            { label: 'Total Rows', value: result.totalRows, cls: 'text-foreground' },
            { label: 'Routed to Brokers', value: result.routedBrokers.length, cls: 'text-emerald-700' },
            { label: 'Alerts Generated', value: result.alertsGenerated, cls: 'text-red-600' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
              <span className={`text-3xl font-black tracking-tighter ${cls}`}>{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Routed brokers */}
      {result.routedBrokers.length > 0 && (
        <Card className="rounded-3xl border border-border shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-sm font-black uppercase tracking-tight">Routed to Brokers</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {result.routedBrokers.map((b: RoutedBroker) => (
              <div key={b.brokerId} className="flex items-center justify-between py-1.5">
                <div>
                  <span className="text-sm font-bold">{b.name}</span>
                  {b.npn && <span className="text-[10px] text-muted-foreground ml-2">NPN: {b.npn}</span>}
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[9px] font-black uppercase px-2">
                  {b.rowCount} rows
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Unmatched rows */}
      {result.unmatchedRows.length > 0 && (
        <Card className="rounded-3xl border border-amber-200 bg-amber-500/5 shadow-sm">
          <CardHeader className="border-b bg-amber-500/5">
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" /> {result.unmatchedRows.length} Groups Need Review
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {result.unmatchedRows.map((row: UnmatchedGroup, i: number) => (
              <div key={i} className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold truncate">{row.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{row.rowCount} rows</span>
                </div>
                {brokers.length > 0 && (
                  <Select
                    value={assignMap[row.npn] ?? ''}
                    onValueChange={v => setAssignMap(m => ({ ...m, [row.npn]: v }))}
                  >
                    <SelectTrigger className="w-44 rounded-2xl font-bold text-[10px] h-8">
                      <SelectValue placeholder="Route Manually..." />
                    </SelectTrigger>
                    <SelectContent>
                      {brokers.map(b => (
                        <SelectItem key={b.id} value={b.id} className="font-bold text-[11px]">
                          {b.first_name} {b.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button asChild className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest h-11">
          <Link href="/dashboard/churn">View Alerts</Link>
        </Button>
        <Button onClick={onReset} variant="outline" className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest h-11">
          Import Another
        </Button>
      </div>
    </div>
  )
}
