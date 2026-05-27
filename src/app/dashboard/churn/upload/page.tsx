'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type SyncState = 'idle' | 'uploading' | 'syncing' | 'success' | 'error';

type ImportResult = {
  imported: number
  dropped: number
  mbiCount: number
  planCount: number
  carrierCount: number
}

// Mirrors server-side ALIAS_MAP — used for client-side preview detection only
const PREVIEW_ALIAS_MAP: Record<string, string[]> = {
  mbi: [
    'mbi', 'medicare id', 'medicare number', 'medicare beneficiary identifier',
    'medicare beneficiary id', 'claim no', 'claim number', 'member id',
    'subscriber id', 'beneficiary id', 'hic number', 'hicn',
    'medicare #', 'medicare no', 'medicaid id', 'insurance id',
    'id number', 'policy number', 'policy #', 'policy no',
    'beneficiary identifier', 'medicare identifier',
  ],
  full_name: [
    'name', 'full name', 'fullname', 'client name', 'beneficiary',
    'member name', 'patient name', 'insured name', 'policyholder',
    'member', 'insured', 'subscriber name', 'subscriber',
    'client', 'consumer name', 'participant name',
  ],
  first_name: [
    'first name', 'firstname', 'first', 'fname', 'given name',
    'given', 'first_name', 'f name', 'member first name',
    'beneficiary first name', 'patient first name',
  ],
  last_name: [
    'last name', 'lastname', 'last', 'lname', 'surname',
    'family name', 'last_name', 'l name', 'member last name',
    'beneficiary last name', 'patient last name',
  ],
  plan_code: [
    'plan', 'plan name', 'plan code', 'plan id', 'planid', 'plan_id',
    'contract', 'contract id', 'contract number', 'pbp',
    'benefit package', 'product', 'product code', 'coverage',
    'insurance plan', 'health plan', 'plan type', 'program',
    'sunfire', 'carrier plan', 'plan description', 'plan title',
    'current plan', 'enrolled plan', 'insurance product',
  ],
  carrier: [
    'carrier', 'insurance company', 'insurer', 'company',
    'insurance carrier', 'health plan', 'payer', 'payer name',
    'insurance', 'provider', 'insurance provider', 'plan sponsor',
  ],
};

const FIELD_LABELS: Record<string, string> = {
  mbi: 'MBI',
  full_name: 'Name',
  first_name: 'First Name',
  last_name: 'Last Name',
  plan_code: 'Plan',
  carrier: 'Carrier',
};

interface PreviewState {
  detectedColumns: Record<string, string>;
  sampleRows: Array<{ name: string; mbi: string; plan: string }>;
  totalRows: number;
  isXlsx: boolean;
}

function resolvePreviewHeader(h: string): string | null {
  const normalized = h.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(PREVIEW_ALIAS_MAP)) {
    if (aliases.includes(normalized)) return field;
  }
  return null;
}

async function buildPreview(f: File): Promise<PreviewState | null> {
  const isXlsx = /\.(xlsx|xls)$/i.test(f.name);

  if (isXlsx) {
    return { detectedColumns: {}, sampleRows: [], totalRows: 0, isXlsx: true };
  }

  let text: string;
  try {
    text = await f.text();
  } catch {
    return null;
  }

  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return null;

  function parseLine(line: string): string[] {
    const cells: string[] = [];
    let inQuote = false;
    let cell = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cells.push(cell.trim()); cell = ''; }
      else { cell += ch; }
    }
    cells.push(cell.trim());
    return cells;
  }

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  const dataLines = lines.slice(1, 4);
  const dataRows = dataLines.map(parseLine);

  const colMap: Record<string, number> = {};
  const detectedColumns: Record<string, string> = {};

  headers.forEach((h, i) => {
    const field = resolvePreviewHeader(h);
    if (field && !(field in colMap)) {
      colMap[field] = i;
      detectedColumns[field] = h;
    }
  });

  const sampleRows = dataRows.map(row => {
    let name = colMap['full_name'] !== undefined ? (row[colMap['full_name']] ?? '') : '';
    if (!name) {
      const first = colMap['first_name'] !== undefined ? (row[colMap['first_name']] ?? '') : '';
      const last = colMap['last_name'] !== undefined ? (row[colMap['last_name']] ?? '') : '';
      name = `${first} ${last}`.trim();
    }
    return {
      name,
      mbi: colMap['mbi'] !== undefined ? (row[colMap['mbi']] ?? '') : '',
      plan: colMap['plan_code'] !== undefined ? (row[colMap['plan_code']] ?? '') : '',
    };
  });

  return {
    detectedColumns,
    sampleRows,
    totalRows: lines.length - 1,
    isXlsx: false,
  };
}

const MARX_PORTAL_URL =
  'https://portal.cms.gov/mma/servlet/mmcs.beneficiaries.eligibility.BeneEligibilityDisplayServlet';

export default function ChurnUploadPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [ghlConnected, setGhlConnected] = useState<boolean | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [marxOpened, setMarxOpened] = useState(false);

  useEffect(() => {
    supabase
      .from('agency_credentials')
      .select('agency_id, access_token')
      .maybeSingle()
      .then(({ data }) => setGhlConnected(!!data?.access_token));
  }, []);

  async function handleFileSelected(f: File) {
    setFile(f);
    setPreview(null);
    const p = await buildPreview(f);
    setPreview(p);
  }

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelected(dropped);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelected(f);
  };

  const handleGhlSync = async () => {
    if (ghlConnected === false) {
      router.push('/api/ghl/connect');
      return;
    }
    setSyncState('syncing');
    setStatusMessage('Syncing contacts from GoHighLevel...');
    try {
      const res = await fetch('/api/ghl/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sync failed');
      setSyncState('success');
      setStatusMessage(`GHL sync complete — ${json.synced ?? 0} contacts updated.`);
    } catch (err: unknown) {
      setSyncState('error');
      setStatusMessage(err instanceof Error ? err.message : 'GHL sync failed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !sheetsUrl.trim()) {
      setStatusMessage('Please drop a file or paste a Google Sheets URL.');
      return;
    }

    setSyncState('uploading');
    setStatusMessage('');
    setPreview(null);
    setImportResult(null);
    setMarxOpened(false);

    try {
      if (sheetsUrl.trim()) {
        const res = await fetch('/api/roster/sheets-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetsUrl: sheetsUrl.trim() }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Sheets import failed');
        setSyncState('success');
        setImportResult({
          imported: json.imported ?? 0,
          dropped: json.dropped ?? 0,
          mbiCount: json.mbiCount ?? (json.imported ?? 0),
          planCount: json.planCount ?? 0,
          carrierCount: json.carrierCount ?? 0,
        });
      } else if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/roster/upload', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Upload failed');
        setSyncState('success');
        setImportResult({
          imported: json.imported ?? 0,
          dropped: json.dropped ?? 0,
          mbiCount: json.mbiCount ?? (json.imported ?? 0),
          planCount: json.planCount ?? 0,
          carrierCount: json.carrierCount ?? 0,
        });
      }
    } catch (err: unknown) {
      setSyncState('error');
      setStatusMessage(err instanceof Error ? err.message : 'An error occurred.');
    }
  };

  const isLoading = syncState === 'uploading' || syncState === 'syncing';

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Roster Import
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upload a carrier roster file or import directly from Google Sheets or GoHighLevel.
        </p>
      </div>

      {/* GHL Sync Button */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950">
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
            GoHighLevel CRM
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400">
            {ghlConnected
              ? 'Connected — pull latest contacts into your book of business.'
              : 'Connect your GHL account to sync contacts automatically.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleGhlSync}
          disabled={isLoading}
          className="shrink-0 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
        >
          {syncState === 'syncing'
            ? 'Syncing...'
            : ghlConnected
            ? 'SYNC WITH GOHIGHLEVEL'
            : 'CONNECT GOHIGHLEVEL'}
        </button>
      </div>

      <div className="relative flex items-center">
        <div className="flex-grow border-t border-gray-200 dark:border-gray-700" />
        <span className="mx-3 text-xs text-gray-400 uppercase tracking-wider">or import a file</span>
        <div className="flex-grow border-t border-gray-200 dark:border-gray-700" />
      </div>

      {/* Download Template */}
      <div className="flex items-center justify-between -mt-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Use our template for the best import results.
        </p>
        <a
          href="/api/roster/template"
          download
          className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 underline underline-offset-2 transition-colors"
        >
          Download Template CSV
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drag and Drop Zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors
            ${isDragging
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-gray-900'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          {file ? (
            <div className="text-center">
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB — click to change</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drop your roster file here
              </p>
              <p className="text-xs text-gray-400 mt-1">CSV, XLSX, or XLS — any carrier format accepted</p>
            </div>
          )}
        </div>

        {/* File Preview */}
        {preview && (
          <div className="p-4 rounded-lg border border-gray-700 bg-gray-900">
            {preview.isXlsx ? (
              <p className="text-xs text-gray-400">
                XLSX file selected — columns will be auto-detected on import.
              </p>
            ) : (
              <>
                <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-widest">Detected Columns</p>
                {Object.keys(preview.detectedColumns).length > 0 ? (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {Object.entries(preview.detectedColumns).map(([field, header]) => (
                      <span key={field} className="px-2 py-1 text-xs rounded bg-indigo-900 text-indigo-300 font-mono">
                        {header} → {FIELD_LABELS[field] ?? field}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-400 mb-3">No recognized column headers — MBI will be detected from content.</p>
                )}
                <p className="text-xs text-gray-500 mb-2">{preview.totalRows} rows detected</p>
                {preview.sampleRows.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="text-xs text-gray-300 w-full">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="text-left pb-1 pr-4">Name</th>
                          <th className="text-left pb-1 pr-4">MBI</th>
                          <th className="text-left pb-1">Plan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sampleRows.map((row, i) => (
                          <tr key={i} className="border-t border-gray-800">
                            <td className="py-1 pr-4">{row.name || '—'}</td>
                            <td className="py-1 pr-4 font-mono">{row.mbi || '—'}</td>
                            <td className="py-1">{row.plan || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Google Sheets URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Or paste a Google Sheets URL
          </label>
          <input
            type="url"
            value={sheetsUrl}
            onChange={(e) => setSheetsUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Status / error message */}
        {statusMessage && (
          <div className={`rounded-lg px-4 py-3 text-sm ${
            syncState === 'error'
              ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
          }`}>
            {statusMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || (!file && !sheetsUrl.trim())}
          className="w-full py-3 px-4 text-sm font-semibold rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          {syncState === 'uploading' ? 'Processing...' : 'Import Roster'}
        </button>
      </form>

      {/* Post-import: quality report + MARx baseline prompt */}
      {syncState === 'success' && importResult && (
        <div className="space-y-4">

          {/* Import Quality Report */}
          <div className="rounded-lg border border-gray-700 p-4">
            <p className="text-sm font-medium text-white mb-3">Import Quality Report</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Members imported</span>
                <span className="text-white font-medium">{importResult.imported}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">MBI captured</span>
                <span className={importResult.mbiCount === importResult.imported ? 'text-green-400' : 'text-yellow-400'}>
                  {importResult.mbiCount}/{importResult.imported}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Plan name captured</span>
                <span className={importResult.planCount === importResult.imported ? 'text-green-400' : 'text-yellow-400'}>
                  {importResult.planCount}/{importResult.imported}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Carrier captured</span>
                <span className={importResult.carrierCount === importResult.imported ? 'text-green-400' : 'text-yellow-400'}>
                  {importResult.carrierCount}/{importResult.imported}
                </span>
              </div>
            </div>

            {(importResult.planCount < importResult.imported || importResult.carrierCount < importResult.imported) && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-yellow-400">
                  Missing plan or carrier data?{' '}
                  <a href="/api/roster/template" download className="underline ml-1">
                    Download our template
                  </a>
                  {' '}for best results, or run a MARx baseline check to auto-populate plan data from CMS.
                </p>
              </div>
            )}

            {importResult.dropped > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                {importResult.dropped} row{importResult.dropped !== 1 ? 's' : ''} in your source file had no Medicare ID and were skipped.
              </p>
            )}
          </div>

          {/* MARx Baseline Prompt */}
          {!marxOpened ? (
            <div className="rounded-lg border border-indigo-700 bg-indigo-950/40 p-4">
              <p className="text-sm font-semibold text-white mb-1">
                {importResult.imported} member{importResult.imported !== 1 ? 's' : ''} imported.
                {' '}Run MARx now to establish their baseline plans?
              </p>
              <p className="text-xs text-indigo-300 mb-3">
                MARx pulls current plan data directly from CMS — filling in any missing carrier and plan info automatically.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.open(MARX_PORTAL_URL, '_blank');
                    setMarxOpened(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  Run MARx Baseline
                </button>
                <button
                  type="button"
                  onClick={() => setMarxOpened(true)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-700 bg-emerald-950/40 p-4">
              <p className="text-sm font-semibold text-emerald-300 mb-1">CMS MARx portal opened</p>
              <p className="text-xs text-emerald-400/80">
                Log into the CMS portal, then click{' '}
                <strong className="text-emerald-300">Run MARx Check</strong>{' '}
                in the AegisSage extension to verify all {importResult.imported} members.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
