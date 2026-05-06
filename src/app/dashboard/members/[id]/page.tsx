"use client"

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { decryptPhiFields } from '@/app/actions/phi';
import { getPlanData, MedicarePlan } from '@/services/plan_data';
import { generateSaveScript } from '@/app/actions/save-script';
import { syncToCrm } from '@/app/actions/crm_sync';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldAlert, Phone, ShieldCheck, Calendar, Activity, Lock, Bot, Copy, ArrowRight, TrendingDown, Loader2, CloudUpload } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function MemberDetailView() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [member, setMember] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [decryptedMbi, setDecryptedMbi] = useState('••••••••••');
  const [decryptedPhone, setDecryptedPhone] = useState('••••••••••');
  const [loading, setLoading] = useState(true);
  const [scriptText, setScriptText] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!id || !auth) return;

    const fetchMember = async () => {
      try {
        const agencyId = auth.currentUser?.uid;
        if (!agencyId) return;

        // Fetch member document
        const docRef = doc(db, 'members', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          toast({ title: 'Not found', description: 'Member record not found.', variant: 'destructive' });
          router.push('/dashboard');
          return;
        }

        const data = docSnap.data();
        setMember(data);

        // Fetch history
        const historyRef = collection(db, 'members', id, 'status_history');
        const q = query(historyRef, orderBy('recordedAt', 'desc'));
        const hSnap = await getDocs(q);
        const hData = hSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setHistory(hData);

        // Log compliance access
        try {
          await addDoc(collection(db, 'phi_access_logs'), {
            memberId: id,
            agencyId,
            brokerId: auth.currentUser?.uid || 'unknown',
            action: 'MEMBER_DETAIL_VIEW',
            timestamp: serverTimestamp()
          });
        } catch (e) {
          console.error("Failed to log PHI access", e);
        }

        // Decrypt PHI
        const result = await decryptPhiFields(
          agencyId,
          { cipher: data.mbi_number_cipher, iv: data.mbi_number_iv },
          { cipher: data.phone_number_cipher, iv: data.phone_number_iv }
        );

        setDecryptedMbi(result.mbi || 'DECRYPTION FAILED');
        setDecryptedPhone(result.phone || 'DECRYPTION FAILED');

      } catch (error) {
        console.error("Error fetching member detail:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchMember();
      }
    });

    return () => unsubscribe();
  }, [id, router, toast]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse uppercase font-black tracking-widest">Loading Member Node...</div>;
  }

  if (!member) return null;

  const isHighRisk = member.status === 'PROVISIONALLY_DISENROLLED' || member.status === 'PLAN_CHANGED';
  
  // Calculate days until effective
  let daysRemaining = null;
  let oldPlan: MedicarePlan | null = null;
  let newPlan: MedicarePlan | null = null;

  if (isHighRisk && history.length > 0) {
    // Find the first event that has an effective_date
    const latestEvent = history.find(h => h.effective_date);
    if (latestEvent) {
      const effective = new Date(latestEvent.effective_date).getTime();
      daysRemaining = Math.ceil((effective - Date.now()) / (1000 * 60 * 60 * 24));
      
      oldPlan = getPlanData(latestEvent.previous_plan_id);
      newPlan = getPlanData(member.current_plan_id);
    }
  }

  const handleGenerateScript = async () => {
    if (!oldPlan || !newPlan) return;
    setIsGeneratingScript(true);
    try {
      const script = await generateSaveScript(oldPlan, newPlan, member.fullName || 'Valued Member');
      setScriptText(script);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: 'Failed to generate script.' });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptText);
    toast({ title: 'Copied', description: 'Exported Talking Points to Clipboard.' });
  };

  const handleSyncToCrm = async () => {
    const agencyId = auth.currentUser?.uid;
    if (!agencyId) return;

    setIsSyncing(true);
    try {
      const result = await syncToCrm(agencyId, id, scriptText, isHighRisk ? 'HIGH_RISK' : 'STABLE');
      toast({ title: 'Sync Successful', description: `Data pushed to ${result.destinations.join(' & ')}.` });
      // Opt. refresh member state
      setMember({ ...member, lastCrmSync: new Date() });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'CRM Sync Failed', description: e.message || 'Please check your CRM settings.' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-background">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-xl">
          <Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Member Intelligence</h1>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">ID: {id}</p>
        </div>
      </div>

      {isHighRisk && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-[2rem] p-6 flex flex-col md:flex-row items-start md:items-center gap-6 animate-in slide-in-from-top-4">
          <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-amber-500 uppercase tracking-tight mb-1">Action Required: Provisional Disenrollment</h2>
            <p className="text-xs font-bold text-amber-500/80 uppercase tracking-widest">
              {daysRemaining !== null && daysRemaining > 0 
                ? `${daysRemaining} days until this member's plan change takes effect.` 
                : "Plan change has taken effect or effective date unknown."}
            </p>
          </div>
          <Button className="h-12 px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest shadow-xl shadow-amber-500/20">
            <Phone className="w-4 h-4 mr-2" /> Call Member Now
          </Button>
        </div>
      )}

      {isHighRisk && oldPlan && newPlan && (
        <Card className="rounded-[2.5rem] border-none bg-muted/20 shadow-inner overflow-hidden animate-in slide-in-from-bottom-4">
          <CardHeader className="bg-primary/5 pb-4 border-b border-border/50">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center justify-between">
              <span className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Plan Comparison Intelligence</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 bg-background rounded-[2rem] p-6 border border-border shadow-sm w-full">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 text-center">Previous Plan</h4>
                <div className="text-center space-y-2 mb-6">
                  <p className="text-xl font-black uppercase tracking-tight">{oldPlan.name}</p>
                  <Badge variant="outline" className="text-xs uppercase">{oldPlan.carrier}</Badge>
                </div>
                <div className="space-y-4 text-sm font-bold">
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Premium</span><span>${oldPlan.premium}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">MOOP</span><span>${oldPlan.moop}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Star Rating</span><span>{oldPlan.star_rating} ⭐</span></div>
                </div>
              </div>

              <div className="flex items-center justify-center shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </div>

              <div className="flex-1 bg-background rounded-[2rem] p-6 border border-border shadow-sm w-full">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 text-center">New Plan Detected</h4>
                <div className="text-center space-y-2 mb-6">
                  <p className="text-xl font-black uppercase tracking-tight">{newPlan.name}</p>
                  <Badge variant="outline" className="text-xs uppercase">{newPlan.carrier}</Badge>
                </div>
                <div className="space-y-4 text-sm font-bold">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Premium</span>
                    <span className={newPlan.premium > oldPlan.premium ? 'text-destructive flex items-center gap-1' : ''}>
                      ${newPlan.premium} {newPlan.premium > oldPlan.premium && <TrendingDown className="w-3 h-3" />}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">MOOP</span>
                    <span className={newPlan.moop > oldPlan.moop ? 'text-destructive flex items-center gap-1' : ''}>
                      ${newPlan.moop} {newPlan.moop > oldPlan.moop && <TrendingDown className="w-3 h-3" />}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Star Rating</span>
                    <span className={newPlan.star_rating < oldPlan.star_rating ? 'text-destructive flex items-center gap-1' : ''}>
                      {newPlan.star_rating} ⭐ {newPlan.star_rating < oldPlan.star_rating && <TrendingDown className="w-3 h-3" />}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" /> AI Save Script
                </h4>
                {!scriptText && (
                  <Button onClick={handleGenerateScript} disabled={isGeneratingScript} size="sm" className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest">
                    {isGeneratingScript ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Bot className="w-3 h-3 mr-2" />} 
                    Generate Talking Points
                  </Button>
                )}
              </div>
              
              {scriptText && (
                <div className="space-y-4">
                  <div className="p-4 bg-background rounded-2xl text-sm leading-relaxed border border-border font-medium">
                    {scriptText}
                  </div>
                  <div className="flex flex-col md:flex-row gap-3">
                    <Button onClick={copyToClipboard} variant="outline" className="flex-1 h-12 rounded-2xl border-primary/20 hover:bg-primary/5 text-primary font-black uppercase tracking-widest text-xs">
                      <Copy className="w-4 h-4 mr-2" /> Copy to Clipboard
                    </Button>
                    <Button onClick={handleSyncToCrm} disabled={isSyncing} className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20">
                      {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />} 
                      Push to CRM
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <Card className="rounded-[2.5rem] border-none bg-muted/20 shadow-inner">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Lock className="w-4 h-4" /> Secure PHI Vault
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Medicare Beneficiary ID</p>
                <div className="bg-background rounded-2xl p-4 font-mono font-bold text-sm border border-border flex justify-between items-center">
                  {decryptedMbi}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verified Phone</p>
                <div className="bg-background rounded-2xl p-4 font-mono font-bold text-sm border border-border flex justify-between items-center">
                  {decryptedPhone}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Plan</p>
                <div className="bg-background rounded-2xl p-4 font-bold text-sm border border-border">
                  {member.current_plan_id || 'Unknown'}
                </div>
              </div>
              <div className="text-[8px] font-black uppercase tracking-widest text-emerald-500 text-center flex items-center justify-center gap-1.5 opacity-70">
                <ShieldCheck className="w-3 h-3" /> PHI Access Logged for Audit
              </div>
              {member.lastCrmSync && (
                <div className="text-[8px] font-black uppercase tracking-widest text-primary text-center flex items-center justify-center gap-1.5 opacity-70 border-t border-border pt-4">
                  <CloudUpload className="w-3 h-3" /> Last CRM Sync: {member.lastCrmSync?.toDate ? member.lastCrmSync.toDate().toLocaleString() : new Date(member.lastCrmSync).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="rounded-[2.5rem] border-none bg-card shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Retention Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l-2 border-muted ml-4 space-y-8 py-4">
                {history.length === 0 && (
                  <div className="pl-6 text-xs font-bold uppercase text-muted-foreground">No history events found.</div>
                )}
                {history.map((event, i) => {
                  let dateStr = 'Recent';
                  if (event.recordedAt) {
                    if (event.recordedAt.toDate) {
                      dateStr = event.recordedAt.toDate().toLocaleString();
                    } else if (event.recordedAt.seconds) {
                      dateStr = new Date(event.recordedAt.seconds * 1000).toLocaleString();
                    }
                  }
                  
                  return (
                    <div key={event.id || i} className="relative pl-8">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {dateStr}
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-tight">
                          {event.status === 'ACTIVE' && 'Enrolled / Stable'}
                          {event.status === 'PROVISIONALLY_DISENROLLED' && `Plan Changed ${event.previous_plan_id || 'Unknown'} → ${event.plan_id}`}
                          {event.status === 'PLAN_CHANGED' && `Switched to ${event.plan_id}`}
                        </h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase">
                          Source: {event.source || 'Unknown'}
                        </p>
                        {event.effective_date && (
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-2 bg-primary/10 inline-block px-2 py-1 rounded-md">
                            Effective: {event.effective_date}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
