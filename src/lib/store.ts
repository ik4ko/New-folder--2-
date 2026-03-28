import { create } from 'zustand';

export interface ClientRecord {
  id: string;
  fullName: string;
  age: number;
  healthConditions: string[];
  medicareMedicaidStatus: 'None' | 'Medicare' | 'Medicaid' | 'Both';
  lastReviewDate: string;
  address?: string;
  documentNumber?: string;
  status: 'active' | 'pending' | 'churn-risk';
  updatedAt: number;
  agentId: string;
}

interface AppState {
  clients: ClientRecord[];
  isSynced: boolean;
  addClient: (client: Omit<ClientRecord, 'id' | 'updatedAt' | 'agentId'>) => void;
  updateClient: (id: string, updates: Partial<ClientRecord>) => void;
  setClients: (clients: ClientRecord[]) => void;
  triggerSync: () => void;
}

// In a real app, this would use Gun.js and Firestore. 
// We are mocking the LWW (Last-Write-Wins) and P2P sync logic.
export const useAppStore = create<AppState>((set) => ({
  clients: [],
  isSynced: true,
  addClient: (clientData) => set((state) => {
    const newClient: ClientRecord = {
      ...clientData,
      id: Math.random().toString(36).substr(2, 9),
      updatedAt: Date.now(),
      agentId: 'agent-123',
      status: 'active'
    };
    const updatedClients = [...state.clients, newClient];
    localStorage.setItem('insurance_clients', JSON.stringify(updatedClients));
    return { clients: updatedClients, isSynced: false };
  }),
  updateClient: (id, updates) => set((state) => {
    const updatedClients = state.clients.map(c => 
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
    );
    localStorage.setItem('insurance_clients', JSON.stringify(updatedClients));
    return { clients: updatedClients, isSynced: false };
  }),
  setClients: (clients) => set({ clients }),
  triggerSync: () => {
    set({ isSynced: false });
    setTimeout(() => {
      set({ isSynced: true });
    }, 2000);
  }
}));

// Initialize from LocalStorage
export const initializeStore = () => {
  const saved = localStorage.getItem('insurance_clients');
  if (saved) {
    useAppStore.getState().setClients(JSON.parse(saved));
  } else {
    // Seed data
    const seed: ClientRecord[] = [
      { id: '1', fullName: 'John Doe', age: 65, healthConditions: ['Diabetes'], medicareMedicaidStatus: 'Medicare', lastReviewDate: '2023-01-15', status: 'churn-risk', updatedAt: Date.now(), agentId: 'agent-123' },
      { id: '2', fullName: 'Jane Smith', age: 45, healthConditions: [], medicareMedicaidStatus: 'None', lastReviewDate: '2024-05-20', status: 'active', updatedAt: Date.now(), agentId: 'agent-123' }
    ];
    localStorage.setItem('insurance_clients', JSON.stringify(seed));
    useAppStore.getState().setClients(seed);
  }
};