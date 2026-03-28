import { create } from 'zustand';

export interface MemberRecord {
  id: string;
  fullName: string;
  medicareId: string;
  age: number;
  carrier: string;
  planName: string;
  healthConditions: string[];
  medicareMedicaidStatus: 'None' | 'Medicare' | 'Medicaid' | 'Both';
  enrollmentDate: string;
  lastReviewDate: string;
  status: 'active' | 'pending' | 'churn-risk' | 'disenrolled';
  ssbciStatus: 'not-needed' | 'pending-fax' | 'faxed' | 'approved';
  poaStatus: 'unprotected' | 'pending-invite' | 'shielded';
  retentionScore: number; // 0-100
  updatedAt: number;
  agentId: string;
  notes?: string;
}

interface AppState {
  members: MemberRecord[];
  isSynced: boolean;
  isGHLConnected: boolean;
  addMember: (member: Omit<MemberRecord, 'id' | 'updatedAt' | 'agentId' | 'status' | 'retentionScore'>) => void;
  updateMember: (id: string, updates: Partial<MemberRecord>) => void;
  setMembers: (members: MemberRecord[]) => void;
  triggerSync: () => void;
  toggleGHL: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  members: [],
  isSynced: true,
  isGHLConnected: false,
  addMember: (memberData) => set((state) => {
    const newMember: MemberRecord = {
      ...memberData,
      id: Math.random().toString(36).substr(2, 9),
      status: 'active',
      retentionScore: 85,
      updatedAt: Date.now(),
      agentId: 'agent-123',
    };
    const updatedMembers = [...state.members, newMember];
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
  triggerSync: () => {
    set({ isSynced: false });
    setTimeout(() => set({ isSynced: true }), 1500);
  },
  toggleGHL: () => set((state) => ({ isGHLConnected: !state.isGHLConnected }))
}));

export const initializeStore = () => {
  if (typeof window === 'undefined') return;
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
        carrier: 'Clover Health',
        planName: 'Clover Health Choice (PPO)',
        healthConditions: ['Diabetes', 'Hypertension'], 
        medicareMedicaidStatus: 'Medicare', 
        enrollmentDate: '2024-01-10',
        lastReviewDate: '2023-01-15', 
        status: 'churn-risk', 
        ssbciStatus: 'pending-fax',
        poaStatus: 'unprotected',
        retentionScore: 42,
        updatedAt: Date.now(), 
        agentId: 'agent-123',
        notes: "Member hasn't been contacted in 12 months. CMS shows potential switch to Humana."
      },
      { 
        id: '2', 
        fullName: 'Alice Johnson', 
        medicareId: '9KL2-PX1-ZZ09',
        age: 72, 
        carrier: 'UnitedHealthcare',
        planName: 'AARP Medicare Advantage (HMO)',
        healthConditions: [], 
        medicareMedicaidStatus: 'Both', 
        enrollmentDate: '2023-11-20',
        lastReviewDate: '2024-05-20', 
        status: 'active', 
        ssbciStatus: 'not-needed',
        poaStatus: 'shielded',
        retentionScore: 94,
        updatedAt: Date.now(), 
        agentId: 'agent-123' 
      },
      { 
        id: '3', 
        fullName: 'Maria Rodriguez', 
        medicareId: '3BT5-LM1-WQ88',
        age: 65, 
        carrier: 'Humana',
        planName: 'Humana Gold Plus (HMO)',
        healthConditions: ['Respiratory Issue'], 
        medicareMedicaidStatus: 'None', 
        enrollmentDate: '2024-02-15',
        lastReviewDate: '2024-02-15', 
        status: 'active', 
        ssbciStatus: 'pending-fax',
        poaStatus: 'pending-invite',
        retentionScore: 88,
        updatedAt: Date.now(), 
        agentId: 'agent-123' 
      }
    ];
    localStorage.setItem('medistay_members', JSON.stringify(seed));
    useAppStore.getState().setMembers(seed);
  }
};