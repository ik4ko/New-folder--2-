
import { create } from 'zustand';
import { faker } from '@faker-js/faker';
import { Firestore, doc, setDoc } from 'firebase/firestore';

/**
 * @fileOverview Application state management for MediStay.
 */

export type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'pt' | 'it' | 'ru' | 'ar';

export interface MemberRecord {
  id: string;
  fullName: string;
  medicareId: string;
  ssnLast4?: string;
  address?: string;
  pharmacyName?: string;
  status: 'active' | 'churn-risk' | 'pending';
  retentionScore: number;
  lastSync: string;
  carrier: string;
  planName: string;
  updatedAt?: number;
  phone: string;
  email: string;
  dob: string;
  age: number;
  medicareMedicaidStatus: 'None' | 'Medicare' | 'Medicaid' | 'Both';
  ssbciStatus: 'not-needed' | 'pending-fax' | 'faxed' | 'approved';
  checkInStatus: 'scheduled' | 'called' | 'completed' | 'escalated';
  poaStatus: 'unprotected' | 'pending-invite' | 'shielded';
  poaName?: string;
  poaPhone?: string;
  lastCallSentiment?: string;
  lastCallTranscript?: string;
  ptcExpiryDate: string;
  pcpName?: string;
  notes?: string;
  monthlyPremium: string;
  enrollmentPeriod: 'IEP' | 'AEP' | 'SEP' | 'OE';
  soaStatus: string;
  soaDate?: string;
  partAEffective: string;
  partBEffective: string;
  healthConditions: string[];
  lastCmsCheck?: number;
  futureContract?: string;
  futurePlanName?: string;
  futureEffectiveDate?: string;
}

export interface ClientRecord extends Partial<MemberRecord> {
  agentId?: string;
  lastReviewDate?: string;
}

export interface Transaction {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending';
  type: string;
}

export interface AgencyProfile {
  name: string;
  email: string;
  billingPlan: 'entry' | 'starter' | 'pro' | 'enterprise';
  isSubscriptionActive: boolean;
  isTrialInitialized: boolean;
  trialStartedAt?: string;
  isSolo: boolean;
  licenseNumber: string;
  tier: 'Basic' | 'Growth' | 'Enterprise';
}

export interface MayaSettings {
  voiceName: 'Algenib' | 'Achernar';
  script: string;
  autoEscalate: boolean;
}

export interface GHLSettings {
  apiKey: string;
  locationId: string;
  webhookUrl: string;
  fieldMapping: {
    medicareId: string;
    carrier: string;
    planName: string;
    enrollmentPeriod: string;
    partAEffective: string;
    partBEffective: string;
    pcpName: string;
  };
}

interface AppState {
  language: Language;
  setLanguage: (lang: Language) => void;
  members: MemberRecord[];
  clients: ClientRecord[];
  ledger: Transaction[];
  brokers: { id: string; name: string; role: string; email: string; npn: string }[];
  agencyProfile: AgencyProfile;
  mayaSettings: MayaSettings;
  ghlSettings: GHLSettings;
  isGHLConnected: boolean;
  isSidebarOpen: boolean;
  isRosterOpen: boolean;
  activeTutorial: 'none' | 'enrollment' | 'retention';
  tutorialStep: number;
  encryptionKey: CryptoKey | null;
  
  // Actions
  addMember: (member: Partial<MemberRecord>) => void;
  updateMember: (id: string, updates: Partial<MemberRecord>) => void;
  addClient: (client: Partial<ClientRecord>) => void;
  addBroker: (broker: any) => void;
  updateBroker: (id: string, updates: any) => void;
  updateAgencyProfile: (updates: Partial<AgencyProfile>) => void;
  updateMayaSettings: (updates: Partial<MayaSettings>) => void;
  updateGHLSettings: (updates: Partial<GHLSettings>) => void;
  toggleGHL: () => void;
  importFromGHL: (count: number) => void;
  toggleSidebar: () => void;
  toggleRoster: () => void;
  startTutorial: (type: 'enrollment' | 'retention') => void;
  nextTutorialStep: () => void;
  closeTutorial: () => void;
  setEncryptionKey: (key: CryptoKey) => void;
  syncToCloudVault: (db: Firestore, userId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),
  members: [],
  clients: [],
  ledger: [],
  brokers: [
    { id: '1', name: 'Agent Primary', role: 'Agency Owner', email: 'admin@medistay.ai', npn: '19920112' }
  ],
  agencyProfile: {
    name: "Elite Medicare Group",
    email: "",
    billingPlan: 'entry',
    isSubscriptionActive: true,
    isTrialInitialized: false,
    isSolo: false,
    licenseNumber: "NPN-882100",
    tier: 'Basic'
  },
  mayaSettings: {
    voiceName: 'Algenib',
    script: "Hi {member_name}, this is Maya from the agency. I'm just calling to ensure you've received your new {carrier} ID card and that you're satisfied with your coverage. Is your current doctor still in-network?",
    autoEscalate: true
  },
  ghlSettings: {
    apiKey: "",
    locationId: "",
    webhookUrl: "https://api.medistay.ai/v1/webhooks/ghl/123",
    fieldMapping: {
      medicareId: "contact.medicare_id",
      carrier: "contact.carrier",
      planName: "contact.plan_name",
      enrollmentPeriod: "contact.enrollment_period",
      partAEffective: "contact.part_a_date",
      partBEffective: "contact.part_b_date",
      pcpName: "contact.primary_physician"
    }
  },
  isGHLConnected: false,
  isSidebarOpen: true,
  isRosterOpen: false,
  activeTutorial: 'none',
  tutorialStep: 0,
  encryptionKey: null,

  addMember: (m) => set(s => ({
    members: [...s.members, {
      id: crypto.randomUUID(),
      fullName: m.fullName || "New Member",
      status: m.status || 'active',
      retentionScore: m.retentionScore || 100,
      ...m
    } as MemberRecord]
  })),
  
  updateMember: (id, updates) => set(s => ({
    members: s.members.map(m => m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m)
  })),

  addClient: (c) => set(s => ({
    clients: [...s.clients, { id: crypto.randomUUID(), ...c }]
  })),

  addBroker: (b) => set(s => ({
    brokers: [...s.brokers, { id: crypto.randomUUID(), ...b }]
  })),

  updateBroker: (id, updates) => set(s => ({
    brokers: s.brokers.map(b => b.id === id ? { ...b, ...updates } : b)
  })),

  updateAgencyProfile: (updates) => set(s => ({
    agencyProfile: { ...s.agencyProfile, ...updates }
  })),

  updateMayaSettings: (updates) => set(s => ({
    mayaSettings: { ...s.mayaSettings, ...updates }
  })),

  updateGHLSettings: (updates) => set(s => ({
    ghlSettings: { ...s.ghlSettings, ...updates }
  })),

  toggleGHL: () => set(s => ({ isGHLConnected: !s.isGHLConnected })),

  importFromGHL: (count) => {
    const carriers = ["UnitedHealthcare", "Humana", "Aetna", "Clover Health"];
    const newMembers = Array.from({ length: count }).map(() => ({
      id: faker.string.uuid(),
      fullName: faker.person.fullName(),
      medicareId: faker.string.alphanumeric(11).toUpperCase(),
      status: faker.helpers.arrayElement(['active', 'churn-risk', 'active']),
      retentionScore: faker.number.int({ min: 40, max: 98 }),
      lastSync: new Date().toISOString(),
      carrier: faker.helpers.arrayElement(carriers),
      planName: "Choice PPO Plus",
      phone: faker.phone.number(),
      email: faker.internet.email(),
      dob: faker.date.birthdate({ min: 65, max: 90, mode: 'age' }).toISOString().split('T')[0],
      age: 70,
      medicareMedicaidStatus: 'None' as const,
      ssbciStatus: faker.helpers.arrayElement(['not-needed', 'pending-fax', 'approved']),
      checkInStatus: 'scheduled' as const,
      poaStatus: faker.helpers.arrayElement(['unprotected', 'shielded']),
      ptcExpiryDate: "2026-01-01",
      monthlyPremium: "$0.00",
      enrollmentPeriod: "AEP" as const,
      soaStatus: "Completed",
      partAEffective: "2020-01-01",
      partBEffective: "2020-01-01",
      healthConditions: [],
      lastCmsCheck: Date.now() - (Math.random() * 10000000),
      futureContract: Math.random() > 0.8 ? 'H' + faker.string.numeric(4) : undefined,
      futurePlanName: Math.random() > 0.8 ? faker.helpers.arrayElement(['Humana Gold', 'Aetna Select', 'UHC Choice']) : undefined
    }));
    set(s => ({ members: [...s.members, ...newMembers] }));
  },

  toggleSidebar: () => set(s => ({ isSidebarOpen: !s.isSidebarOpen })),
  toggleRoster: () => set(s => ({ isRosterOpen: !s.isRosterOpen })),
  
  startTutorial: (type) => set({ activeTutorial: type, tutorialStep: 0 }),
  nextTutorialStep: () => set(s => ({ tutorialStep: s.tutorialStep + 1 })),
  closeTutorial: () => set({ activeTutorial: 'none', tutorialStep: 0 }),

  setEncryptionKey: (key) => set({ encryptionKey: key }),
  
  syncToCloudVault: async (db, userId) => {
    const { agencyProfile, ghlSettings, mayaSettings } = get();
    await setDoc(doc(db, 'vaults', userId), {
      agencyProfile,
      ghlSettings,
      mayaSettings,
      updatedAt: Date.now()
    }, { merge: true });
  }
}));

export const initializeStore = () => {
  const store = useAppStore.getState();
  if (store.members.length === 0) {
    store.importFromGHL(12);
    // Seed some ledger data
    useAppStore.setState({
      ledger: [
        { id: '1', memberId: 'M1', memberName: 'Robert Miller', amount: 600, date: '2024-11-01', status: 'paid', type: 'Renewal' },
        { id: '2', memberId: 'M2', memberName: 'Sarah Jenkins', amount: 600, date: '2024-11-05', status: 'pending', type: 'Renewal' }
      ]
    });
  }
};
