'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';

export interface RiskEvent {
  id: string;
  memberId: string;
  agencyId: string;
  brokerId: string;
  event: string;
  riskLevel: 'HIGH' | 'LOW';
  previousPlanId: string;
  newPlanId: string;
  effectiveDate: string; // ISO date string, e.g. '2026-09-01'
  triggerReason: string | null;
  daysUntilEffective: number | null; // stored at write time — component recomputes from effectiveDate
  source: string;
  createdAt: unknown; // Firestore Timestamp — use .toDate() if needed
}

interface UseRiskEventsResult {
  events: RiskEvent[];
  loading: boolean;
  error: string | null;
}

export function useRiskEvents(maxItems = 20): UseRiskEventsResult {
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // auth and db are null during SSR; this effect only runs client-side
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    let unsubSnap: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Clean up any previous Firestore subscription when auth changes
      if (unsubSnap) {
        unsubSnap();
        unsubSnap = null;
      }

      if (!user) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, 'risk_events'),
        where('brokerId', '==', user.uid),
        where('riskLevel', '==', 'HIGH'),
        orderBy('createdAt', 'desc'),
        limit(maxItems),
      );

      unsubSnap = onSnapshot(
        q,
        (snap) => {
          setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RiskEvent)));
          setLoading(false);
          setError(null);
        },
        (err) => {
          // Firestore missing-index errors include a console link to create the index
          console.error('[useRiskEvents] Firestore error:', err);
          setError('risk_events unavailable');
          setLoading(false);
        },
      );
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, [maxItems]);

  return { events, loading, error };
}
