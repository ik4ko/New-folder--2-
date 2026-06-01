import { Badge } from "@/components/ui/badge"
import { Shield, Lock, Eye, Database, Trash2, FileCheck } from "lucide-react"
import Link from "next/link"
import { MarketingShell } from "@/components/marketing-shell"

export const metadata = {
  title: "Privacy Policy | AegisSage",
  description: "AegisSage data minimization and HIPAA privacy policy.",
}

const SECTIONS = [
  {
    icon: Database,
    title: "Data We Collect",
    content: `AegisSage collects only the minimum data necessary to deliver our Medicare retention monitoring service. This includes: (a) account registration information (name, email, NPN number); (b) Medicare Beneficiary Identifiers (MBIs) and related Protected Health Information (PHI) submitted by licensed agents on behalf of their clients; (c) carrier roster data uploaded by agents for plan-switch monitoring; and (d) platform usage metadata (login timestamps, feature interactions). We do not sell, rent, or broker any data to third parties under any circumstances.`,
  },
  {
    icon: Shield,
    title: "HIPAA Compliance & Business Associate Agreements",
    content: `AegisSage operates as a Business Associate under HIPAA for all agency customers. A signed Business Associate Agreement (BAA) is required before any Protected Health Information may be processed through the platform. All PHI is handled in strict accordance with 45 CFR Parts 160 and 164 (the HIPAA Privacy and Security Rules). MBI numbers and other PHI fields are encrypted at rest using AES-256 and in transit using TLS 1.3. Only authorized personnel with a documented business need may access PHI, and all such access is logged and auditable.`,
  },
  {
    icon: Lock,
    title: "Data Minimization",
    content: `We apply data minimization as a first principle. MBI data entered into AegisSage is stored in encrypted form and is never used for any purpose other than MARx verification and VCC form pre-population. We do not train AI models on PHI. We do not aggregate or re-identify de-identified data. Roster files uploaded for monitoring are processed and retained only for the duration necessary to run scheduled comparisons. Agents may request deletion of any member record at any time.`,
  },
  {
    icon: Eye,
    title: "Data Retention",
    content: `Active account data is retained for the duration of your subscription. Upon cancellation, account data is retained for 30 days to allow for export, then permanently deleted. Backup copies are purged within 90 days of account termination. PHI contained in VCC submissions is retained for a minimum of six years in compliance with HIPAA records retention requirements unless a shorter retention period is requested and legally permissible. Agents may submit a data deletion request to privacy@aegissage.com.`,
  },
  {
    icon: FileCheck,
    title: "Your Rights",
    content: `Licensed agents have the right to: (a) access all data held about their account; (b) correct inaccurate data; (c) request deletion of their account and associated data; (d) receive a machine-readable export of their data; (e) withdraw consent for optional data processing at any time. Requests may be submitted to privacy@aegissage.com. We will respond within 30 days. For PHI access or amendment requests related to a specific Medicare beneficiary, agents must follow applicable HIPAA procedures and may be required to provide written authorization from the beneficiary.`,
  },
  {
    icon: Trash2,
    title: "Third-Party Processors",
    content: `AegisSage uses a limited set of sub-processors to deliver the platform: Supabase (database hosting on AWS infrastructure, HIPAA-eligible), Vercel (application hosting, non-PHI layers only), SendGrid (transactional email, non-PHI alerts only), and Stripe (payment processing, PCI-DSS compliant). No PHI is transmitted to Stripe or Vercel. All sub-processors are reviewed annually and subject to Data Processing Agreements. A full sub-processor list is available upon request.`,
  },
]

// Chrome extension disclosures are required by the Chrome Web Store policy for
// extensions that handle user data. These apply specifically to the
// "AegisSage Roster Sync" browser extension.
const EXTENSION_DISCLOSURES = [
  {
    heading: "Scope of Access",
    body: "The extension activates exclusively on carrier portal pages into which the broker has independently authenticated. The extension does not access, read, or interact with any other browser tabs, websites, or locally stored browser data outside of these authorized carrier portal sessions.",
  },
  {
    heading: "Data Collected by the Extension",
    body: "When a broker initiates a sync action, the extension reads the currently visible enrollment table on the active carrier portal page. The specific data elements parsed are limited to: Medicare Beneficiary Identifiers (MBIs), member names, plan codes, and enrollment status indicators as displayed on the page. No data is collected passively or without explicit broker action.",
  },
  {
    heading: "Transmission and Storage",
    body: "All data parsed by the extension is immediately transmitted via encrypted HTTPS/TLS connection to AegisSage's secure backend infrastructure (Supabase). No enrollment data, MBI values, or member information is written to local browser storage, extension storage, cookies, or any device-local file. The extension holds data in memory only for the duration of the active sync operation.",
  },
  {
    heading: "No Remote Code Execution",
    body: "The extension does not load, execute, or inject remote code of any kind. All extension logic is self-contained within the locally installed extension package. The content security policy enforces script-src 'self' with no exceptions.",
  },
  {
    heading: "No Third-Party Data Sharing",
    body: "Data processed by the extension is transmitted exclusively to AegisSage's own backend systems. No extension-collected data is sold, licensed, shared with, or accessible by any third-party service, advertising platform, analytics provider, or data broker.",
  },
  {
    heading: "Authentication and Access Control",
    body: "The extension requires a valid AegisSage account and authenticated API key to transmit any data. Unauthenticated extension instances return no data and cannot interact with AegisSage systems. The extension includes a remote kill-switch: if a broker's account is terminated or suspended, the extension ceases all data transmission immediately.",
  },
]

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <main className="max-w-3xl mx-auto py-24 px-8 space-y-12">

        <div className="space-y-4">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">
            Effective: January 1, 2026 · Last Updated: May 28, 2026
          </Badge>
          <h1 className="text-5xl font-black tracking-tighter uppercase">Privacy Policy</h1>
          <p className="text-lg font-bold text-muted-foreground uppercase tracking-tight leading-relaxed">
            AegisSage is committed to the highest standards of healthcare data privacy. This policy governs how we
            collect, process, store, and protect data on behalf of licensed Medicare agents and their clients.
          </p>
        </div>

        {/* Highlight */}
        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-start gap-4">
          <Shield className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-black uppercase tracking-tight text-emerald-900">We Do Not Sell Your Data. Ever.</p>
            <p className="text-sm text-emerald-700 font-medium">
              AegisSage does not sell, rent, license, or share any personal data or PHI with third parties for commercial purposes. Period.
            </p>
          </div>
        </div>

        {/* Core sections */}
        <div className="space-y-10">
          {SECTIONS.map((s, i) => (
            <section key={i} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight">{i + 1}. {s.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed pl-11">{s.content}</p>
            </section>
          ))}
        </div>

        {/* Chrome extension disclosures */}
        <section className="space-y-6 p-8 rounded-3xl bg-muted/20 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">
              {SECTIONS.length + 1}. Chrome Extension — AegisSage Roster Sync
            </h2>
          </div>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed pl-11">
            AegisSage offers a Chrome browser extension that licensed brokers may install to facilitate roster
            monitoring directly from carrier portal pages. The following practices apply specifically to the extension.
          </p>
          <div className="pl-11 space-y-5">
            {EXTENSION_DISCLOSURES.map((d) => (
              <div key={d.heading} className="space-y-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground/70">{d.heading}</h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <div className="p-6 rounded-3xl bg-muted/30 border border-border space-y-3">
          <p className="text-sm font-black uppercase tracking-tight">Contact Our Privacy Team</p>
          <p className="text-sm text-muted-foreground font-medium">For all privacy inquiries, data access requests, or BAA execution:</p>
          <a href="mailto:privacy@aegissage.com" className="inline-block font-black text-primary hover:text-primary/80 transition-colors">
            privacy@aegissage.com
          </a>
          <p className="text-xs text-muted-foreground font-medium">
            AegisSage Intelligence Inc. · HIPAA Covered Entity Operations · Response within 30 days
          </p>
        </div>

        {/* Related pages — canonical links only */}
        <div className="flex flex-wrap gap-4 pt-4">
          <Link href="/terms" className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">
            Terms of Service →
          </Link>
          <Link href="/security-compliance" className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">
            Security &amp; Compliance →
          </Link>
          <Link href="/baa" className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">
            BAA Agreement →
          </Link>
        </div>

      </main>
    </MarketingShell>
  )
}
