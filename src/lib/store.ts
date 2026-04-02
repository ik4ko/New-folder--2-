import { create } from 'zustand';

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
  checkInStatus: 'scheduled' | 'called' | 'escalated' | 'completed';
  retentionScore: number; // 0-100
  updatedAt: number;
  agentId: string;
  notes?: string;
  pcpName?: string;
  pharmacyName?: string;
  lastCallTranscript?: string;
  lastCallSentiment?: 'Positive' | 'Neutral' | 'Negative';
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
}

export const useAppStore = create<AppState>((set) => ({
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
    isSolo: false,
    primaryColor: '#0F4C81',
    billingPlan: 'pro',
    isSubscriptionActive: true,
  },
  addMember: (memberData) => set((state) => {
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
  updateGHLSettings: (updates) => set((state) => ({
    ghlSettings: { ...state.ghlSettings, ...updates }
  })),
  updateMayaSettings: (updates) => set((state) => ({
    mayaSettings: { ...state.mayaSettings, ...updates }
  })),
  updateAgencyProfile: (updates) => set((state) => ({
    agencyProfile: { ...state.agencyProfile, ...updates }
  })),
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
}));

export const initializeStore = () => {
  if (typeof window === 'undefined') return;
  try {
    const savedMembers = localStorage.getItem('medistay_members');
    if (savedMembers) {
      useAppStore.getState().setMembers(JSON.parse(savedMembers));
    } else {
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
          pharmacyName: 'CVS #4402'
        },
        { 
          id: '2', 
          fullName: 'Alice Johnson', 
          medicareId: '9KL2-PX1-ZZ09',
          age: 72, 
          dob: '1952-11-30',
          ssnLast4: '8812',
          email: 'alice.j@example.com',
          phone: '415-555-0881',
          address: '122 Maple St, Oakland, CA',
          carrier: 'UnitedHealthcare',
          planName: 'AARP Medicare Advantage (HMO)',
          monthlyPremium: '$0.00',
          healthConditions: [], 
          medications: [],
          medicareMedicaidStatus: 'Both', 
          enrollmentDate: '2023-11-20',
          lastReviewDate: '2024-05-20', 
          partAEffective: '2017-12-01',
          partBEffective: '2017-12-01',
          soaStatus: 'Completed',
          soaDate: '2023-11-15',
          enrollmentPeriod: 'IEP',
          status: 'active', 
          ssbciStatus: 'not-needed',
          poaStatus: 'shielded',
          checkInStatus: 'completed',
          retentionScore: 94,
          updatedAt: Date.now(), 
          agentId: 'agent-123',
          notes: "High loyalty member. POA Shield active via daughter (Sarah J).",
          pcpName: 'Dr. Michael West',
          pharmacyName: 'Walgreens #110'
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
        { id: 'agent-123', name: 'John Doe', email: 'john@agency.com', role: 'owner', status: 'active', npn: '12345678' },
        { id: 'agent-456', name: 'Sarah Smith', email: 'sarah@agency.com', role: 'broker', status: 'active', npn: '87654321' },
        { id: 'admin-789', name: 'Mike Admin', email: 'admin@agency.com', role: 'admin', status: 'active', npn: '00000000' }
      ];
      localStorage.setItem('medistay_brokers', JSON.stringify(seedBrokers));
      useAppStore.getState().setBrokers(seedBrokers);
    }

    const savedLedger = localStorage.getItem('medistay_ledger');
    if (savedLedger) {
      useAppStore.getState().setLedger(JSON.parse(savedLedger));
    } else {
      const seedLedger: FinancialTransaction[] = [
        { id: 't1', memberId: '1', memberName: 'Robert Miller', date: '2024-11-01', amount: 50.00, type: 'renewal', status: 'paid' },
        { id: 't2', memberId: '2', memberName: 'Alice Johnson', date: '2024-11-05', amount: 600.00, type: 'commission', status: 'paid' },
        { id: 't3', memberId: '1', memberName: 'Robert Miller', date: '2024-12-01', amount: 50.00, type: 'renewal', status: 'pending' }
      ];
      localStorage.setItem('medistay_ledger', JSON.stringify(seedLedger));
      useAppStore.getState().setLedger(seedLedger);
    }
  } catch (e) {
    console.error("Failed to initialize store", e);
  }
};
