"use client"

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { processCsvIngestion } from '@/app/actions/ingest';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleProcessFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload a valid .csv file.' });
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) throw new Error('File is empty or missing data rows.');

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const hasPlanId = headers.includes('plan_id') || headers.includes('new_plan_id');
      if (!headers.includes('mbi_number') || !headers.includes('effective_date') || !hasPlanId) {
        throw new Error('Missing mandatory headers. Required: mbi_number, effective_date, plan_id (or new_plan_id).');
      }

      const getIdx = (field: string) => headers.indexOf(field);
      
      const payload = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim());
        const planIdIdx = getIdx('plan_id') >= 0 ? getIdx('plan_id') : getIdx('new_plan_id');
        return {
          mbi_number: cols[getIdx('mbi_number')] || '',
          plan_id: cols[planIdIdx] || '',
          effective_date: cols[getIdx('effective_date')] || '',
          date_of_birth: getIdx('date_of_birth') >= 0 ? cols[getIdx('date_of_birth')] : '',
          phone_number: getIdx('phone_number') >= 0 ? cols[getIdx('phone_number')] : '',
          source: 'csv_upload'
        };
      }).filter(row => row.mbi_number && row.plan_id);

      const agencyId = auth.currentUser?.uid;
      const brokerId = auth.currentUser?.uid;

      if (!agencyId || !brokerId) {
        throw new Error('User not authenticated. Please log in.');
      }

      const result = await processCsvIngestion(agencyId, brokerId, payload);
      
      toast({ 
        title: 'Ingestion Complete', 
        description: `Successfully updated ${result.updated} members. Detected ${result.highRisk} High-Risk switches.` 
      });

      router.push('/dashboard');
      
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: e.message });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 bg-background">
      <div className="space-y-1">
        <h1 className="text-2xl font-black uppercase tracking-tight">Secure Batch Ingestion</h1>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upload Carrier CSV Reports for processing.</p>
      </div>

      <Card className={`border-dashed border-2 transition-all duration-300 ${isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-primary/20 bg-primary/5'} rounded-[2.5rem]`}>
        <CardContent 
          className="flex flex-col items-center justify-center p-12 md:p-24 text-center"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="space-y-4 flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="font-black uppercase tracking-widest text-sm text-primary">Processing Data...</p>
            </div>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
                <UploadCloud className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">Drag & Drop CSV</h3>
              <p className="text-sm font-bold text-muted-foreground mb-8">Ensure headers match: mbi_number, effective_date, plan_id</p>
              
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
              >
                Browse Files
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-4 items-start max-w-3xl">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-1">HIPAA Compliance Notice</h4>
          <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">
            All PHI uploaded through this portal is encrypted instantly at the field level using AES-256-GCM before being stored in the database. Raw CSVs are not retained.
          </p>
        </div>
      </div>
    </div>
  );
}
