import { create } from 'zustand';
import { faker } from '@faker-js/faker';

/**
 * @fileOverview Application state management for MediStay.
 * Handles member records, agency profiles, and demo mode seeding.
 */

export interface MemberRecord {
  id: string;
  name: string;
  medicareId: string;
  status: 'Active' | 'At Risk' | 'Switch Pending' | 'Critical';
  riskScore: number;
  lastSync: string;
  carrier: string;
  planName: string;
}

export interface AgencyProfile {
  agencyName: string;
  email: string;
  tier: 'Basic' | 'Growth' | 'Enterprise';
}

interface AppState {
  members: MemberRecord[];
  profile: AgencyProfile | null;
  isDemo: boolean;
  setMembers: (members: MemberRecord[]) => void;
  setProfile: (profile: AgencyProfile | null) => void;
  setIsDemo: (isDemo: boolean) => void;
  seedDemoData: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  members: [],
  profile: null,
  isDemo: false,
  setMembers: (members) => set({ members }),
  setProfile: (profile) => set({ profile }),
  setIsDemo: (isDemo) => set({ isDemo }),
  seedDemoData: () => {
    const carriers = ["UnitedHealthcare", "Humana", "Aetna", "Blue Cross", "Clover Health"];
    const statuses: MemberRecord['status'][] = ['Active', 'At Risk', 'Switch Pending', 'Critical'];
    
    const demoMembers: MemberRecord[] = Array.from({ length: 15 }).map(() => {
      const carrier = faker.helpers.arrayElement(carriers);
      return {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        medicareId: faker.helpers.replaceSymbols('####-???-####').toUpperCase(),
        status: faker.helpers.arrayElement(statuses),
        riskScore: faker.number.int({ min: 1, max: 10 }),
        lastSync: new Date().toISOString(),
        carrier,
        planName: `${carrier} ${faker.helpers.arrayElement(['Choice PPO', 'Gold HMO', 'Value Plan'])}`
      };
    });

    set({ members: demoMembers, isDemo: true });
  }
}));
