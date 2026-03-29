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
}

interface AppState {
  members: MemberRecord[];
  isSynced: boolean;
  isGHLConnected: boolean;
  isSidebarOpen: boolean;
  ghlSettings: GHLSettings;
  agencyProfile: AgencyProfile;
  addMember: (member: Partial<MemberRecord>) => void;
  updateMember: (id: string, updates: Partial<MemberRecord>) => void;
  setMembers: (members: MemberRecord[]) => void;
  triggerSync: () => void;
  toggleGHL: () => void;
  toggleSidebar: () => void;
  updateGHLSettings: (updates: Partial<GHLSettings>) => void;
  updateAgencyProfile: (updates: Partial<AgencyProfile>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  members: [],
  isSynced: true,
  isGHLConnected: false,
  isSidebarOpen: true,
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('medistay_members', JSON.stringify(updatedMembers));
    }
    return { members: updatedMembers, isSynced: false };
  }),
  updateMember: (id, updates) => set((state) => {
    const updatedMembers = state.members.map(m => 
      m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m
    );
    if (typeof window !== 'undefined') {
      localStorage.setItem('medistay_members', JSON.stringify(updatedMembers));
    }
    return { members: updatedMembers, isSynced: false };
  }),
  setMembers: (members) => set({ members }),
  triggerSync: () => {
    set({ isSynced: false });
    setTimeout(() => set({ isSynced: true }), 1500);
  },
  toggleGHL: () => set((state) => ({ isGHLConnected: !state.isGHLConnected })),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  updateGHLSettings: (updates) => set((state) => ({
    ghlSettings: { ...state.ghlSettings, ...updates }
  })),
  updateAgencyProfile: (updates) => set((state) => ({
    agencyProfile: { ...state.agencyProfile, ...updates }
  })),
}));

export const initializeStore = () => {
  if (typeof window === 'undefined') return;
  try {
    const saved = localStorage.getItem('medistay_members');
    if (saved) {
      useAppStore.getState().setMembers(JSON.parse(saved));
    } else {
      const seed: MemberRecord[] = [
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
        },
        { 
          id: '3', 
          fullName: 'Maria Rodriguez', 
          medicareId: '3BT5-LM1-WQ88',
          age: 65, 
          dob: '1959-02-15',
          ssnLast4: '2291',
          email: 'm.rodriguez@example.com',
          phone: '415-555-0331',
          address: '88 Mission St, SF, CA',
          carrier: 'Humana',
          planName: 'Humana Gold Plus (HMO)',
          monthlyPremium: '$19.00',
          healthConditions: ['Respiratory Issue'], 
          medications: [{ name: 'Albuterol', dosage: '90mcg', tier: 2, frequency: 'As needed' }],
          medicareMedicaidStatus: 'None', 
          enrollmentDate: '2024-02-15',
          lastReviewDate: '2024-02-15', 
          partAEffective: '2024-03-01',
          partBEffective: '2024-03-01',
          soaStatus: 'Completed',
          soaDate: '2024-02-10',
          enrollmentPeriod: 'IEP',
          status: 'active', 
          ssbciStatus: 'pending-fax',
          poaStatus: 'pending-invite',
          checkInStatus: 'called',
          retentionScore: 88,
          updatedAt: Date.now(), 
          agentId: 'agent-123',
          notes: "Module 3: Chronic condition identified. SSBCI package generated for respiratory support.",
          pcpName: 'Dr. John Doe',
          pharmacyName: 'Rite Aid #902'
        },
        { 
          id: '4', 
          fullName: 'James Thompson', 
          medicareId: '4TT1-RE2-MM11',
          age: 70, 
          dob: '1954-08-22',
          ssnLast4: '9901',
          email: 'j.thompson@example.com',
          phone: '415-555-9981',
          address: '333 Pine St, SF, CA',
          carrier: 'Blue Shield',
          planName: 'Blue Shield Inspire (HMO)',
          monthlyPremium: '$0.00',
          healthConditions: ['Hypertension'], 
          medications: [{ name: 'Amlodipine', dosage: '5mg', tier: 1, frequency: 'Once Daily' }],
          medicareMedicaidStatus: 'None', 
          enrollmentDate: '2023-10-01',
          lastReviewDate: '2023-10-01', 
          partAEffective: '2019-09-01',
          partBEffective: '2019-09-01',
          soaStatus: 'Completed',
          soaDate: '2023-09-25',
          enrollmentPeriod: 'AEP',
          status: 'active', 
          ssbciStatus: 'not-needed',
          poaStatus: 'unprotected',
          checkInStatus: 'completed',
          retentionScore: 72,
          updatedAt: Date.now(), 
          agentId: 'agent-123',
          pcpName: 'Dr. Alan Smith',
          pharmacyName: 'Walgreens #221'
        },
        { 
          id: '5', 
          fullName: 'Linda Garcia', 
          medicareId: '5LL9-WW3-PP44',
          age: 66, 
          dob: '1958-05-14',
          ssnLast4: '3341',
          email: 'l.garcia@example.com',
          phone: '415-555-3341',
          address: '777 Market St, SF, CA',
          carrier: 'Kaiser Permanente',
          planName: 'Kaiser Senior Advantage (HMO)',
          monthlyPremium: '$0.00',
          healthConditions: ['Diabetes'], 
          medications: [{ name: 'Insulin', dosage: 'Variable', tier: 2, frequency: 'As directed' }],
          medicareMedicaidStatus: 'Medicaid', 
          enrollmentDate: '2024-03-01',
          lastReviewDate: '2024-03-01', 
          partAEffective: '2023-06-01',
          partBEffective: '2023-06-01',
          soaStatus: 'Completed',
          soaDate: '2024-02-28',
          enrollmentPeriod: 'SEP',
          status: 'active', 
          ssbciStatus: 'approved',
          poaStatus: 'shielded',
          checkInStatus: 'completed',
          retentionScore: 98,
          updatedAt: Date.now(), 
          agentId: 'agent-123',
          pcpName: 'Dr. Kaiser Provider',
          pharmacyName: 'Kaiser Pharmacy'
        }
      ];
      localStorage.setItem('medistay_members', JSON.stringify(seed));
      useAppStore.getState().setMembers(seed);
    }
  } catch (e) {
    console.error("Failed to initialize store", e);
    localStorage.removeItem('medistay_members');
  }
};
