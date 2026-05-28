import Link from "next/link"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Shield, Lock, Eye, Database, Trash2, FileCheck } from "lucide-react"

export const metadata = { title: "Privacy Policy | AegisSage", description: "AegisSage data minimization and HIPAA privacy policy." }

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

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-20 border-b border-border/50 px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-50">
        <Link href="/" className="flex items-center gap-3"><Logo /></Link>
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-black uppercase text-[10px] tracking-widest">
          <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" />Back</Link>
        </Button>
      </header>

      <main className="max-w-3xl mx-auto py-24 px-8 space-y-12">
        <div className="space-y-4">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">
            Effective: January 1, 2026 · Last Updated: May 28, 2026
          </Badge>
          <h1 className="text-5xl font-black tracking-tighter uppercase">Privacy Policy</h1>
          <p className="text-lg font-bold text-muted-foreground uppercase tracking-tight leading-relaxed">
            AegisSage is committed to the highest standards of healthcare data privacy. This policy governs how we collect, process, store, and protect data on behalf of licensed Medicare agents and their clients.
          </p>
        </div>

        {/* Highlight box */}
        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-start gap-4">
          <Shield className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-black uppercase tracking-tight text-emerald-900">We Do Not Sell Your Data. Ever.</p>
            <p className="text-sm text-emerald-700 font-medium">AegisSage does not sell, rent, license, or share any personal data or PHI with third parties for commercial purposes. Period.</p>
          </div>
        </div>

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

        <div className="p-6 rounded-3xl bg-muted/30 border border-border space-y-3">
          <p className="text-sm font-black uppercase tracking-tight">Contact Our Privacy Team</p>
          <p className="text-sm text-muted-foreground font-medium">For all privacy inquiries, data access requests, or BAA execution:</p>
          <a href="mailto:privacy@aegissage.com" className="inline-block font-black text-primary hover:text-primary/80 transition-colors">
            privacy@aegissage.com
          </a>
          <p className="text-xs text-muted-foreground font-medium">AegisSage Intelligence Inc. · HIPAA Covered Entity Operations · Response within 30 days</p>
        </div>

        <div className="flex flex-wrap gap-4 pt-4">
          <Link href="/terms-of-service" className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">Terms of Service →</Link>
          <Link href="/security-compliance" className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">Security & Compliance →</Link>
          <Link href="/baa" className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">BAA Agreement →</Link>
        </div>
      </main>
    </div>
  )
}
