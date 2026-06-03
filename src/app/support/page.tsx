import { Mail, Clock } from "lucide-react"
import { MarketingShell } from "@/components/marketing-shell"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export const metadata = {
  title: "Support | AegisSage",
  description: "Get help with AegisSage — contact support or browse common questions.",
}

const FAQS = [
  {
    question: "How do I add clients to my book?",
    answer:
      "Log in to AegisSage and navigate to Book of Business. You can upload a CSV file with your client roster — we need each client's name, member ID, and current plan. Your data is encrypted and stored securely the moment it's imported. We'll walk you through the column mapping on the upload screen so nothing is left to chance.",
  },
  {
    question: "What triggers an alert?",
    answer:
      "AegisSage checks CMS enrollment data on your behalf. An alert fires when we detect a plan status change, a pending plan switch, or a disenrollment signal for any client in your book. You'll be notified before the change takes effect — giving you time to reach out, have a conversation, and retain the relationship.",
  },
  {
    question: "Is my client data secure?",
    answer:
      "Yes. All client data — including Medicare Beneficiary Identifiers and plan information — is encrypted at rest and in transit. Access is enforced at the database level so each broker sees only their own clients; no cross-agency data leakage is possible by design. We maintain HIPAA-compliant infrastructure and every PHI access event is logged for audit purposes. A signed Business Associate Agreement (BAA) is in place before any data is processed.",
  },
]

export default function SupportPage() {
  return (
    <MarketingShell>
      <main className="mx-auto max-w-2xl space-y-14 px-8 py-24">

        <div className="space-y-3">
          <h1 className="text-4xl font-black uppercase tracking-tighter">
            AegisSage <span className="text-primary">Support</span>
          </h1>
          <p className="text-muted-foreground font-bold text-sm leading-relaxed">
            We're here to help. Reach out directly or find answers to common questions below.
          </p>
        </div>

        {/* Contact card */}
        <div className="flex items-start gap-5 rounded-3xl border border-border bg-muted/20 p-7">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-black uppercase tracking-tight">General Support</h2>
            <a
              href="mailto:support@aegissage.com"
              className="block font-black text-primary hover:text-primary/80 transition-colors"
            >
              support@aegissage.com
            </a>
            <div className="flex items-center gap-1.5 pt-0.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                Response within 1 business day
              </span>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          <h2 className="text-xl font-black uppercase tracking-tight">Common Questions</h2>
          <Accordion type="single" collapsible className="w-full space-y-2">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-2xl border border-border bg-muted/10 px-5 data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="text-sm font-black uppercase tracking-tight hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm font-medium leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

      </main>
    </MarketingShell>
  )
}
