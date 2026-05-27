
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, Lock, Eye, FileCheck, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/logo"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      <header className="h-20 border-b border-border/50 px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-3">
          <Logo />
        </Link>
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest">
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
        </Button>
      </header>

      <main className="max-w-3xl mx-auto py-24 px-8 space-y-12">
        <div className="space-y-4">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Last Updated: May 24, 2025</Badge>
          <h1 className="text-5xl font-black tracking-tighter uppercase">Privacy Policy</h1>
          <p className="text-lg font-bold text-muted-foreground uppercase tracking-tight">At AegisSage, PHI security is our first priority. We operate under strict HIPAA Business Associate Agreements.</p>
        </div>

        <section className="space-y-8">
          <div className="p-8 rounded-3xl bg-muted/20 border border-border space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              01. Data Encryption
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              All member data (MBI numbers, DOB, Health conditions) is encrypted using AES-256 standards both at rest and in transit. Access is strictly governed by role-based permissions and Multi-Factor Authentication.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-muted/20 border border-border space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <Eye className="w-5 h-5 text-primary" />
              02. Use of Information
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              We process data solely for the purpose of providing retention services to the Agency. AegisSage does not sell member data, nor do we share it with third parties outside of our BAA partners (AWS, Twilio, SageStream).
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-muted/20 border border-border space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-primary" />
              03. HIPAA Compliance
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              We maintain a 10-year retention policy for all SOA records and audit logs, fulfilling federal requirements for Medicare Advantage marketing and enrollment activities.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-muted/20 border border-border space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              04. Chrome Extension — AegisSage Roster Sync
            </h2>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
              AegisSage offers a Chrome browser extension (&ldquo;AegisSage Roster Sync&rdquo;) that licensed brokers may install to facilitate roster monitoring directly from carrier portal pages. The following practices apply specifically to the extension:
            </p>

            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground/70">Scope of Access</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
                The extension activates exclusively on carrier portal pages into which the broker has independently authenticated. The extension does not access, read, or interact with any other browser tabs, websites, or locally stored browser data outside of these authorized carrier portal sessions.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground/70">Data Collected by the Extension</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
                When a broker initiates a sync action, the extension reads the currently visible enrollment table on the active carrier portal page. The specific data elements parsed are limited to: Medicare Beneficiary Identifiers (MBIs), member names, plan codes, and enrollment status indicators as displayed on the page. No data is collected passively or without explicit broker action.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground/70">Transmission and Storage</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
                All data parsed by the extension is immediately transmitted via encrypted HTTPS/TLS connection to AegisSage&rsquo;s secure backend infrastructure (Supabase). No enrollment data, MBI values, or member information is written to local browser storage, extension storage, cookies, or any device-local file. The extension holds data in memory only for the duration of the active sync operation.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground/70">No Remote Code Execution</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
                The extension does not load, execute, or inject remote code of any kind. All extension logic is self-contained within the locally installed extension package. The content security policy enforces <code className="font-mono text-primary/80 not-uppercase normal-case">script-src &apos;self&apos;</code> with no exceptions.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground/70">No Third-Party Data Sharing</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
                Data processed by the extension is transmitted exclusively to AegisSage&rsquo;s own backend systems. No extension-collected data is sold, licensed, shared with, or accessible by any third-party service, advertising platform, analytics provider, or data broker.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground/70">Authentication and Access Control</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase opacity-80">
                The extension requires a valid AegisSage account and authenticated API key to transmit any data. Unauthenticated extension instances return no data and cannot interact with AegisSage systems. The extension includes a remote kill-switch: if a broker&rsquo;s account is terminated or suspended, the extension ceases all data transmission immediately.
              </p>
            </div>
          </div>
        </section>

        <div className="pt-12 text-center border-t border-border/50">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Questions? Contact privacy@aegissage.com</p>
        </div>
      </main>
    </div>
  )
}
