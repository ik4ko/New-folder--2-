'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Link2, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function GHLConnectPage() {
  const [locationId, setLocationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: broker } = await supabase
        .from('brokers')
        .select('ghl_location_id')
        .eq('user_id', user.id)
        .maybeSingle()
      setLocationId(broker?.ghl_location_id ?? null)
      setLoading(false)
    })
  }, [])

  return (
    <div className="flex flex-col h-full w-full">
      <header className="h-16 border-b border-border px-8 flex items-center gap-3 bg-background sticky top-0 z-10">
        <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Link2 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight">GHL Connection</h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">GoHighLevel location sync</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 max-w-xl mx-auto w-full space-y-6 pb-32">
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Card className="rounded-3xl border border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> GHL Location Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Location ID</p>
                    <p className="font-mono text-sm font-bold mt-1">
                      {locationId ?? 'Not connected'}
                    </p>
                  </div>
                  <Badge className={locationId
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border font-black uppercase text-[9px]'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20 border font-black uppercase text-[9px]'
                  }>
                    {locationId
                      ? <><CheckCircle2 className="w-3 h-3 mr-1 inline" />Connected</>
                      : <><AlertTriangle className="w-3 h-3 mr-1 inline" />Not Connected</>
                    }
                  </Badge>
                </div>

                {locationId && (
                  <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/15 px-4 py-3">
                    <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                      Your GHL location is linked. Contacts, campaigns, and SMS messages sync through this connection. Contact your agency manager to update or reconnect.
                    </p>
                  </div>
                )}

                {!locationId && (
                  <div className="rounded-2xl bg-amber-500/5 border border-amber-500/15 px-4 py-3">
                    <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                      No GHL location is linked to your broker account. Contact your agency manager to connect your GoHighLevel sub-account. Once connected, contacts and campaigns will sync automatically.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="rounded-2xl bg-muted/30 border border-border px-5 py-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">About GHL Integration</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                AegisSage syncs with GoHighLevel (GHL) to pull your contact list, send SMS messages for AOR signing, and trigger campaign workflows. Each broker is linked to a GHL sub-location. Your agency owner manages the GHL OAuth credentials at the agency level.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
