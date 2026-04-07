import { create } from 'zustand';
import { type Firestore } from 'firebase/firestore';
import { encryptData, syncVaultToCloud } from '@/lib/vault/core';
import { faker } from '@faker-js/faker';

export interface Medication {
  name: string;
  dosage: string;
  tier: number;
  frequency: string;
}

export interface MemberRecord {
  id: string;
  fullName: string;
  medicareId: string;
  age: number;
  dob: string;
  ssnLast4: string;
  email: string;
  phone: string;
  address: string;
  carrier: string;
  planName: string;
  monthlyPremium: string;
  healthConditions: string[];
  medications: Medication[];
  medicareMedicaidStatus: 'None' | 'Medicare' | 'Medicaid' | 'Both';
  enrollmentDate: string;
  lastReviewDate: string;
  partAEffective: string;
  partBEffective: string;
  soaStatus: 'Not Started' | 'Pending' | 'Completed';
  soaDate?: string;
  enrollmentPeriod: 'IEP' | 'AEP' | 'SEP' | 'OE';
  status: 'active' | 'pending' | 'churn-risk' | 'disenrolled';
  ssbciStatus: 'not-needed' | 'pending-fax' | 'faxed' | 'approved';
  poaStatus: 'unprotected' | 'pending-invite' | 'shielded';
  poaName?: string;
  poaPhone?: string;
  checkInStatus: 'scheduled' | 'called' | 'escalated' | 'completed';
  retentionScore: number; // 0-100
  updatedAt: number;
  agentId: string;
  notes?: string;
  pcpName?: string;
  pharmacyName?: string;
  lastCallTranscript?: string;
  lastCallSentiment?: 'Positive' | 'Neutral' | 'Negative';
  ptcExpiryDate: string; // CMS Compliance: PTC expires after 12 months
  lastCmsCheck?: string; // HETS/BEQ last poll timestamp
  futurePlanDetected?: boolean; // Medizues-style pre-effective detection
  futurePlanName?: string;
}

export interface BrokerAccount {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'broker' | 'admin';
  status: 'active' | 'inactive';
  npn: string;
  avatar?: string;
}

export interface FinancialTransaction {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  amount: number;
  type: 'commission' | 'bonus' | 'renewal';
  status: 'paid' | 'pending';
}

export interface MayaSettings {
  voiceName: 'Algenib' | 'Achernar';
  script: string;
  autoEscalate: boolean;
  scheduleDays: number[]; // e.g. [7, 30, 75]
}

export interface GHLSettings {
  locationId: string;
  apiKey: string;
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
  automationEnabled: boolean;
  pipelineId: string;
  stageId: string;
  riskTag: string;
  syncFrequency: 'hourly' | 'daily' | 'manual';
}

export interface AgencyProfile {
  name: string;
  licenseNumber: string;
  email: string;
  phone: string;
  isSolo: boolean;
  logoUrl?: string;
  primaryColor?: string;
  billingPlan: 'entry' | 'starter' | 'pro' | 'enterprise';
  isSubscriptionActive: boolean;
  setupFeePaid: boolean;
}

interface AppState {
  members: MemberRecord[];
  brokers: BrokerAccount[];
  ledger: FinancialTransaction[];
  isSynced: boolean;
  isGHLConnected: boolean;
  isSidebarOpen: boolean;
  isRosterOpen: boolean;
  activeTutorial: 'none' | 'enrollment' | 'retention';
  tutorialStep: number;
  ghlSettings: GHLSettings;
  mayaSettings: MayaSettings;
  agencyProfile: AgencyProfile;
  currentUser: BrokerAccount | null;
  encryptionKey: CryptoKey | null;
  addMember: (member: Partial<MemberRecord>) => void;
  updateMember: (id: string, updates: Partial<MemberRecord>) => void;
  setMembers: (members: MemberRecord[]) => void;
  setBrokers: (brokers: BrokerAccount[]) => void;
  setLedger: (ledger: FinancialTransaction[]) => void;
  triggerSync: () => void;
  toggleGHL: () => void;
  toggleSidebar: () => void;
  toggleRoster: () => void;
  startTutorial: (type: 'enrollment' | 'retention') => void;
  nextTutorialStep: () => void;
  closeTutorial: () => void;
  updateGHLSettings: (updates: Partial<GHLSettings>) => void;
  updateMayaSettings: (updates: Partial<MayaSettings>) => void;
  updateAgencyProfile: (updates: Partial<AgencyProfile>) => void;
  addBroker: (broker: Partial<BrokerAccount>) => void;
  updateBroker: (id: string, updates: Partial<BrokerAccount>) => void;
  setEncryptionKey: (key: CryptoKey | null) => void;
  syncToCloudVault: (db: Firestore, userId: string) => Promise<void>;
  importFromGHL: (count: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  members: [],
  brokers: [],
  ledger: [],
  isSynced: true,
  isGHLConnected: false,
  isSidebarOpen: true,
  isRosterOpen: false,
  activeTutorial: 'none',
  tutorialStep: 0,
  currentUser: null,
  encryptionKey: null,
  mayaSettings: {
    voiceName: 'Algenib',
    script: "Hi, this is Maya from the MediStay team. We've detected a possible change in your provider network and wanted to ensure your doctors still accept your current coverage. How has your experience been with your plan lately?",
    autoEscalate: true,
    scheduleDays: [7, 30, 75],
  },
  ghlSettings: {
    locationId: 'loc_99201_sf',
    apiKey: '',
    webhookUrl: 'https://api.medistay.io/v1/webhooks/ghl/wh_772193',
    fieldMapping: {
      medicareId: 'contact.medicare_mbi',
      carrier: 'contact.current_carrier',
      planName: 'contact.plan_name',
      enrollmentPeriod: 'contact.enrollment_type',
      partAEffective: 'contact.part_a_date',
      partBEffective: 'contact.part_b_date',
      pcpName: 'contact.primary_physician',
    },
    automationEnabled: true,
    pipelineId: 'PL_99201',
    stageId: 'ST_CHURN_ALERT',
    riskTag: 'churn-risk-detected',
    syncFrequency: 'daily',
  },
  agencyProfile: {
    name: 'MediStay Demo Agency',
    licenseNumber: 'NPN-12345678',
    email: 'admin@medistay-demo.com',
    phone: '415-555-0100',
    isSolo: true,
    primaryColor: '#0F4C81',
    billingPlan: 'pro',
    isSubscriptionActive: true,
    setupFeePaid: true,
  },
  addMember: (memberData) => set((state) => {
    const today = new Date();
    const expiry = new Date(today.setFullYear(today.getFullYear() + 1)).toISOString().split('T')[0];
    
    const newMember: MemberRecord = {
      id: Math.random().toString(36).substr(2, 9),
      fullName: 'New Member',
      medicareId: 'TEMP-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
      age: 65,
      dob: '1959-01-01',
      ssnLast4: '0000',
      email: '',
      phone: '',
      address: '',
      carrier: 'Unassigned',
      planName: 'Pending Enrollment',
      monthlyPremium: '$0.00',
      healthConditions: [],
      medications: [],
      medicareMedicaidStatus: 'None',
      enrollmentDate: new Date().toISOString().split('T')[0],
      lastReviewDate: new Date().toISOString().split('T')[0],
      partAEffective: '',
      partBEffective: '',
      soaStatus: 'Not Started',
      enrollmentPeriod: 'IEP',
      status: 'active',
      ssbciStatus: 'not-needed',
      poaStatus: 'unprotected',
      checkInStatus: 'scheduled',
      retentionScore: 85,
      updatedAt: Date.now(),
      agentId: 'agent-123',
      ptcExpiryDate: expiry,
      ...memberData,
    };
    const updatedMembers = [newMember, ...state.members];
    localStorage.setItem('medistay_members', JSON.stringify(updatedMembers));
    return { members: updatedMembers, isSynced: false };
  }),
  updateMember: (id, updates) => set((state) => {
    const updatedMembers = state.members.map(m => 
      m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m
    );
    localStorage.setItem('medistay_members', JSON.stringify(updatedMembers));
    return { members: updatedMembers, isSynced: false };
  }),
  setMembers: (members) => set({ members }),
  setBrokers: (brokers) => set({ brokers }),
  setLedger: (ledger) => set({ ledger }),
  triggerSync: () => {
    set({ isSynced: false });
    setTimeout(() => set({ isSynced: true }), 1500);
  },
  toggleGHL: () => set((state) => ({ isGHLConnected: !state.isGHLConnected })),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleRoster: () => set((state) => ({ isRosterOpen: !state.isRosterOpen })),
  startTutorial: (type) => set({ activeTutorial: type, tutorialStep: 0 }),
  nextTutorialStep: () => set((state) => ({ tutorialStep: state.tutorialStep + 1 })),
  closeTutorial: () => set({ activeTutorial: 'none', tutorialStep: 0 }),
  updateGHLSettings: (updates) => set((state) => {
    const newSettings = { ...state.ghlSettings, ...updates };
    localStorage.setItem('medistay_ghl_settings', JSON.stringify(newSettings));
    return { ghlSettings: newSettings };
  }),
  updateMayaSettings: (updates) => set((state) => {
    const newSettings = { ...state.mayaSettings, ...updates };
    localStorage.setItem('medistay_maya_settings', JSON.stringify(newSettings));
    return { mayaSettings: newSettings };
  }),
  updateAgencyProfile: (updates) => set((state) => {
    const newProfile = { ...state.agencyProfile, ...updates };
    localStorage.setItem('medistay_agency_profile', JSON.stringify(newProfile));
    return { agencyProfile: newProfile };
  }),
  addBroker: (brokerData) => set((state) => {
    const newBroker: BrokerAccount = {
      id: Math.random().toString(36).substr(2, 9),
      name: brokerData.name || 'New Broker',
      email: brokerData.email || '',
      role: brokerData.role || 'broker',
      status: 'active',
      npn: brokerData.npn || '00000000',
    };
    const updated = [...state.brokers, newBroker];
    localStorage.setItem('medistay_brokers', JSON.stringify(updated));
    return { brokers: updated };
  }),
  updateBroker: (id, updates) => set((state) => {
    const updated = state.brokers.map(b => b.id === id ? { ...b, ...updates } : b);
    localStorage.setItem('medistay_brokers', JSON.stringify(updated));
    return { brokers: updated };
  }),
  setEncryptionKey: (key) => set({ encryptionKey: key }),
  syncToCloudVault: async (db, userId) => {
    const { encryptionKey, agencyProfile, ghlSettings, mayaSettings } = get();
    if (!encryptionKey) return;

    try {
      const vaultState = {
        healthRecords: [],
        blueButtonData: null,
        agencyProfile,
        ghlSettings,
        mayaSettings,
        updatedAt: Date.now(),
      };

      const encrypted = await encryptData(vaultState, encryptionKey);
      const blob = { 
        ...encrypted, 
        userId, 
        updatedAt: Date.now(), 
        deviceId: 'browser-client' 
      };

      syncVaultToCloud(db, userId, blob);
      set({ isSynced: true });
    } catch (error) {
      console.error('Vault encryption failed', error);
      set({ isSynced: false });
    }
  },
  importFromGHL: (count) => set((state) => {
    const newFakeMembers: MemberRecord[] = Array.from({ length: count }).map(() => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const birthDate = faker.date.birthdate({ min: 65, max: 95, mode: 'age' });
      const age = new Date().getFullYear() - birthDate.getFullYear();
      
      const conditions = faker.helpers.arrayElements(
        ["Diabetes", "Hypertension", "Heart Condition", "COPD", "Arthritis", "Mobility Issues"],
        { min: 1, max: 3 }
      );

      const carriers = ["UnitedHealthcare", "Humana", "Aetna", "Blue Cross", "Clover Health"];
      const carrier = faker.helpers.arrayElement(carriers);

      return {
        id: faker.string.uuid(),
        fullName: `${firstName} ${lastName}`,
        medicareId: faker.helpers.replaceSymbols('####-???-####').toUpperCase(),
        age,
        dob: birthDate.toISOString().split('T')[0],
        ssnLast4: faker.string.numeric(4),
        email: faker.internet.email({ firstName, lastName }),
        phone: faker.phone.number(),
        address: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state({ abbreviated: true })} ${faker.location.zipCode()}`,
        carrier,
        planName: `${carrier} ${faker.helpers.arrayElement(['Choice PPO', 'Gold HMO', 'Premier Plus', 'Select SNP'])}`,
        monthlyPremium: `$${faker.number.int({ min: 0, max: 150 })}.00`,
        healthConditions: conditions,
        medications: Array.from({ length: faker.number.int({ min: 1, max: 4 }) }).map(() => ({
          name: faker.helpers.arrayElement(["Metformin", "Lisinopril", "Atorvastatin", "Amlodipine", "Levothyroxine"]),
          dosage: `${faker.number.int({ min: 5, max: 100 })}mg`,
          tier: faker.number.int({ min: 1, max: 3 }),
          frequency: faker.helpers.arrayElement(["Once Daily", "Twice Daily", "With Meals"])
        })),
        medicareMedicaidStatus: faker.helpers.arrayElement(['None', 'Medicare', 'Medicaid', 'Both']),
        enrollmentDate: faker.date.past({ years: 2 }).toISOString().split('T')[0],
        lastReviewDate: faker.date.recent({ days: 180 }).toISOString().split('T')[0],
        partAEffective: faker.date.past({ years: 5 }).toISOString().split('T')[0],
        partBEffective: faker.date.past({ years: 5 }).toISOString().split('T')[0],
        soaStatus: 'Completed',
        soaDate: faker.date.recent({ days: 300 }).toISOString().split('T')[0],
        enrollmentPeriod: faker.helpers.arrayElement(['IEP', 'AEP', 'SEP', 'OE']),
        status: faker.helpers.weightedArrayElement([
          { value: 'active', weight: 8 },
          { value: 'churn-risk', weight: 2 }
        ]) as any,
        ssbciStatus: faker.helpers.arrayElement(['not-needed', 'pending-fax', 'approved']),
        poaStatus: faker.helpers.weightedArrayElement([
          { value: 'unprotected', weight: 7 },
          { value: 'shielded', weight: 3 }
        ]) as any,
        checkInStatus: 'scheduled',
        retentionScore: faker.number.int({ min: 30, max: 100 }),
        updatedAt: Date.now(),
        agentId: 'agent-ghl-import',
        notes: "Imported via GHL Sync with full PHI metadata.",
        pcpName: `Dr. ${faker.person.lastName()}`,
        pharmacyName: faker.company.name() + " Pharmacy",
        ptcExpiryDate: faker.date.future({ years: 1 }).toISOString().split('T')[0],
        lastCmsCheck: new Date().toISOString()
      };
    });

    const updatedMembers = [...newFakeMembers, ...state.members];
    localStorage.setItem('medistay_members', JSON.stringify(updatedMembers));
    return { members: updatedMembers, isSynced: false };
  }),
}));

export const initializeStore = () => {
  if (typeof window === 'undefined') return;
  try {
    const savedMembers = localStorage.getItem('medistay_members');
    if (savedMembers) {
      useAppStore.getState().setMembers(JSON.parse(savedMembers));
    } else {
      // Default seeds if none exist
      const seedMembers: MemberRecord[] = [
        { 
          id: '1', 
          fullName: 'Robert Miller', 
          medicareId: '1EG4-TE5-MK22',
          age: 68, 
          dob: '1956-04-12',
          ssnLast4: '4421',
          email: 'r.miller@example.com',
          phone: '415-555-0122',
          address: '452 Oak Lane, SF, CA',
          carrier: 'Clover Health',
          planName: 'Clover Health Choice (PPO)',
          monthlyPremium: '$0.00',
          healthConditions: ['Diabetes', 'Hypertension'], 
          medications: [
            { name: 'Metformin', dosage: '500mg', tier: 1, frequency: 'Twice Daily' },
            { name: 'Lisinopril', dosage: '10mg', tier: 1, frequency: 'Once Daily' }
          ],
          medicareMedicaidStatus: 'Medicare', 
          enrollmentDate: '2024-01-10',
          lastReviewDate: '2023-01-15', 
          partAEffective: '2021-05-01',
          partBEffective: '2021-05-01',
          soaStatus: 'Completed',
          soaDate: '2023-10-12',
          enrollmentPeriod: 'AEP',
          status: 'churn-risk', 
          ssbciStatus: 'pending-fax',
          poaStatus: 'unprotected',
          checkInStatus: 'scheduled',
          retentionScore: 42,
          updatedAt: Date.now(), 
          agentId: 'agent-123',
          notes: "Module 1 Flag: Member detected switching to Humana Gold. Disenrollment pending.",
          pcpName: 'Dr. Sarah Chen',
          pharmacyName: 'CVS #4402',
          ptcExpiryDate: '2025-10-12',
          lastCmsCheck: new Date().toISOString()
        }
      ];
      localStorage.setItem('medistay_members', JSON.stringify(seedMembers));
      useAppStore.getState().setMembers(seedMembers);
    }

    const savedBrokers = localStorage.getItem('medistay_brokers');
    if (savedBrokers) {
      useAppStore.getState().setBrokers(JSON.parse(savedBrokers));
    } else {
      const seedBrokers: BrokerAccount[] = [
        { id: 'agent-123', name: 'John Doe', email: 'john@agency.com', role: 'owner', status: 'active', npn: '12345678' }
      ];
      localStorage.setItem('medistay_brokers', JSON.stringify(seedBrokers));
      useAppStore.getState().setBrokers(seedBrokers);
    }

    // Similar initialization for ledger and settings...
    const savedLedger = localStorage.getItem('medistay_ledger');
    if (savedLedger) useAppStore.getState().setLedger(JSON.parse(savedLedger));

    const savedProfile = localStorage.getItem('medistay_agency_profile');
    if (savedProfile) useAppStore.getState().updateAgencyProfile(JSON.parse(savedProfile));

    const savedGHL = localStorage.getItem('medistay_ghl_settings');
    if (savedGHL) useAppStore.getState().updateGHLSettings(JSON.parse(savedGHL));

    const savedMaya = localStorage.getItem('medistay_maya_settings');
    if (savedMaya) useAppStore.getState().updateMayaSettings(JSON.parse(savedMaya));

  } catch (e) {
    console.error("Failed to initialize store", e);
  }
};