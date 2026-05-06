"use client"

import React, { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { getCrmConfig, saveCrmConfig } from '@/app/actions/crm_sync';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Link as LinkIcon, Webhook, Loader2, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CRMSettingsPage() {
  const { toast } = useToast();
  const [ghlApiKey, setGhlApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      const agencyId = auth.currentUser?.uid;
      if (!agencyId) return;

      try {
        const config = await getCrmConfig(agencyId);
        if (config.ghlApiKey) setGhlApiKey(config.ghlApiKey);
        if (config.webhookUrl) setWebhookUrl(config.webhookUrl);
      } catch (e) {
        console.error("Failed to fetch CRM config", e);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchConfig();
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const agencyId = auth.currentUser?.uid;
    if (!agencyId) return;

    setSaving(true);
    try {
      await saveCrmConfig(agencyId, { 
        ghlApiKey: ghlApiKey.trim(), 
        webhookUrl: webhookUrl.trim() 
      });
      toast({ title: 'Settings Saved', description: 'Your CRM configuration has been securely encrypted and stored.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse uppercase font-black tracking-widest">Loading Configuration Node...</div>;
  }

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 bg-background max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-black uppercase tracking-tight">CRM Integration Bridge</h1>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Configure outbound sync for High-Risk alerts and Talking Points.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <Card className="rounded-[2.5rem] border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/50 pb-6">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" /> GoHighLevel (GHL) Integration
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-wide">
              Directly sync contacts, append notes, and tag members as 'AegisSage-High-Risk'.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Key className="w-3 h-3" /> GHL Location API Key
              </Label>
              <Input 
                type="password" 
                placeholder="Paste your GHL API Key here..."
                value={ghlApiKey}
                onChange={(e) => setGhlApiKey(e.target.value)}
                className="h-12 rounded-2xl font-mono text-sm border-border bg-muted/20"
              />
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Find this in GHL Settings &gt; Business Profile.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/50 pb-6">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Webhook className="w-5 h-5 text-emerald-500" /> EnrollHere & Generic Webhooks
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-wide">
              Push JSON payloads containing risk alerts and script intelligence to any endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Webhook className="w-3 h-3" /> Outbound Webhook URL
              </Label>
              <Input 
                type="url" 
                placeholder="https://api.enrollhere.com/v1/webhook/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="h-12 rounded-2xl font-mono text-sm border-border bg-muted/20"
              />
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Must be a secure HTTPS endpoint.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button 
            type="submit" 
            disabled={saving}
            className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 
            Save Configuration
          </Button>
        </div>
      </form>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-4 items-start">
        <Key className="w-5 h-5 text-primary shrink-0" />
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-1">Zero-Trust Key Architecture</h4>
          <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">
            Your API keys and Webhook URLs are securely encrypted using AES-256-GCM before storage. They are only decrypted ephemerally during an active outbound sync.
          </p>
        </div>
      </div>
    </div>
  );
}
