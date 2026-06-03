import { Badge } from "@/components/ui/badge"
import { Shield, Lock, Eye, Database, Trash2, FileCheck, Bell } from "lucide-react"
import { MarketingShell } from "@/components/marketing-shell"

export const metadata = {
  title: "Privacy Policy | AegisSage",
  description: "AegisSage data minimization and HIPAA privacy policy.",
}

const SECTIONS = [
  {
    icon: Database,
    title: "Data We Collect",
    content: `AegisSage collects only the minimum data necessary to deliver our Medicare retention monitoring service. This includes: (a) account registration information (name, work email, and agency name); (b) Medicare Beneficiary Identifiers (MBIs) and related plan information submitted by licensed agents on behalf of their clients; (c) client roster data uploaded by agents for plan-switch monitoring, consisting of name, member ID, and current plan; and (d) platform usage metadata (login timestamps, feature interactions). We do not collect or store Social Security Numbers, dates of birth, or clinical diagnosis codes. We do not sell, rent, or broker any data to third parties under any circumstances.`,
  },
  {
    icon: Shield,
    title: "HIPAA Compliance & Business Associate Agreements",
    content: `AegisSage operates as a Business Associate under HIPAA for all agency customers. A signed Business Associate Agreement (BAA) is required before any Protected Health Information may be processed through the platform. All PHI is handled in strict accordance with 45 CFR Parts 160 and 164 (the HIPAA Privacy and Security Rules). MBI numbers and other PHI fields are encrypted at rest using AES-256 and in transit using TLS 1.3. Only authorized personnel with a documented business need may access PHI, and all such access is logged and auditable.`,
  },
  {
    icon: Lock,
    title: "How Data Is Stored",
    content: `All data is encrypted at rest and in transit. MBI data submitted by agents is stored in encrypted form and is used exclusively to run plan-switch monitoring checks and, where applicable, to support clinical form routing. Access to stored data is enforced at the database layer using row-level security policies: each broker can access only the records belonging to their own agency. We do not train machine-learning models on PHI. We do not aggregate or re-identify de-identified data.`,
  },
  {
    icon: Eye,
    title: "Who Can Access Your Data",
    content: `Access to client data is scoped per agency. A licensed agent or broker can view and manage only the client records associated with their own agency account. Agency owners may grant access to additional team members within their agency; such access is also bounded to that agency's records. AegisSage staff access PHI only when required to investigate a reported platform issue, under documented authorization, and all such access is logged. No data is accessible to other agencies, to advertisers, or to any third-party commercial entity.`,
  },
  {
    icon: FileCheck,
    title: "Data Retention",
    content: `Active account data is retained for the duration of your subscription. Upon cancellation, account data is retained for 30 days to allow for data export, then permanently deleted. Backup copies are purged within 90 days of account termination. PHI contained in form routing submissions is retained for a minimum of six years in compliance with HIPAA records retention requirements (45 CFR § 164.530(j)), unless a shorter legally permissible period is requested. Agents may submit a data deletion request to privacy@aegissage.com at any time.`,
  },
  {
    icon: Bell,
    title: "Breach Notification",
    content: `In the event of a breach of unsecured PHI, AegisSage will notify affected individuals within 60 days of discovery, in accordance with the HIPAA Breach Notification Rule (45 CFR §§ 164.400–414). For breaches affecting 500 or more individuals, AegisSage will also notify the Secretary of Health and Human Services and, where required, prominent media outlets in the affected area, within the same 60-day period. Notification will include: a description of the breach, the types of PHI involved, steps individuals should take to protect themselves, and the steps AegisSage is taking to investigate the breach and prevent recurrence.`,
  },
  {
    icon: Trash2,
    title: "Sub-Processors",
    content: `AegisSage uses a limited set of vetted, HIPAA-eligible sub-processors to deliver the platform, covering database hosting, application delivery, and payment processing. No PHI is transmitted to payment processors. All sub-processors are reviewed annually and are subject to Data Processing Agreements that restrict their use of data to the specific services they provide to AegisSage. A full sub-processor list is available upon request at privacy@aegissage.com.`,
  },
  {
    icon: Shield,
    title: "Your Rights",
    content: `Licensed agents have the right to: (a) access all data held about their account; (b) correct inaccurate data; (c) request deletion of their account and associated data; (d) receive a machine-readable export of their data; and (e) withdraw consent for optional data processing at any time. Requests may be submitted to privacy@aegissage.com. We will respond within 30 days. For PHI access or amendment requests related to a specific Medicare beneficiary, agents must follow applicable HIPAA procedures and may be required to provide written authorization from the beneficiary.`,
  },
]

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <main className="max-w-3xl mx-auto py-24 px-8 space-y-12">

        <div className="space-y-4">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">
            Effective: January 1, 2026 · Last Updated: June 1, 2026
          </Badge>
          <h1 className="text-5xl font-black tracking-tighter uppercase">Privacy Policy</h1>
          <p className="text-lg font-bold text-muted-foreground uppercase tracking-tight leading-relaxed">
            AegisSage is committed to the highest standards of healthcare data privacy. This policy governs how we
            collect, process, store, and protect data on behalf of licensed Medicare agents and their clients.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-start gap-4">
          <Shield className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-black uppercase tracking-tight text-emerald-900">We Do Not Sell Your Data. Ever.</p>
            <p className="text-sm text-emerald-700 font-medium">
              AegisSage does not sell, rent, license, or share any personal data or PHI with third parties for commercial
              purposes, advertising, or data brokerage. Period.
            </p>
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
          <p className="text-xs text-muted-foreground font-medium">
            AegisSage Intelligence Inc. · HIPAA Business Associate Operations · Response within 30 days
          </p>
        </div>

      </main>
    </MarketingShell>
  )
}
