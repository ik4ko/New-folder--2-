# MediStay Intelligence | Developer Requirements

To successfully develop and maintain the MediStay platform, the following technical competencies and domain knowledge are required.

## 1. Core Technical Stack
*   **Next.js 15+ (App Router)**: Advanced knowledge of Server Components, Server Actions, and nested layouts.
*   **React 19**: Mastery of hooks, concurrent rendering, and performance optimization.
*   **TypeScript**: Strict type safety across the entire application to prevent production regressions.
*   **Tailwind CSS & ShadCN UI**: Rapid development of high-fidelity, accessible, and responsive medical-grade interfaces.
*   **Zustand**: Lightweight state management for handling agency profiles and member rosters.

## 2. Backend & Infrastructure
*   **Firebase Ecosystem**:
    *   **Auth**: Hardened identity management and anonymous demo sessions.
    *   **Firestore**: Real-time NoSQL database structure for multi-tenant SaaS.
*   **Genkit AI**: Architecting AI flows for document OCR, sentiment analysis, and predictive risk scoring.

## 3. Specialized Web APIs
*   **WebCrypto API**: Implementing client-side AES-GCM encryption for zero-knowledge PHI handling.
*   **Internationalization (i18n)**: Managing multi-language dictionaries and RTL (Right-to-Left) layout logic.
*   **Service Workers**: Ensuring offline reliability for clinical environments.

## 4. Third-Party Integrations
*   **Financial**: Stripe API for BAA-compliant subscription management and trial flows.
*   **Clinical Communication**: 
    *   **Spruce Health API**: Secure clinical faxing.
    *   **Twilio**: HIPAA-compliant voice outreach for Maya AI.
*   **Interoperability**: **Stedi** for EDI 270/271 Medicare eligibility handshakes.

## 5. Compliance & Domain Knowledge
*   **HIPAA / BAA**: Understanding administrative and technical safeguards for Protected Health Information (PHI).
*   **CMS Regulations**: Knowledge of 2025 Medicare marketing rules, Scope of Appointment (SOA) retention, and PTC (Permission to Contact) requirements.
*   **Zero-Knowledge Architecture**: Designing systems where the platform provider (MediStay) cannot read sensitive member data.

---
*MediStay Intelligence Inc. | Technical Operations*
