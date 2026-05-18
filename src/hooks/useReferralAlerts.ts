import { useEffect, useCallback, useRef, useState } from "react";
import { getDB } from "@/lib/db";
import type { Assessment, Patient } from "@/types/trij";

const STORAGE_KEY = "trij_seen_referrals";

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set<string>();
  }
}

function persistSeenIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export interface ReferralAlert {
  assessment: Assessment;
  patient?: Patient;
}

export function useReferralAlerts() {
  const [unseen, setUnseen] = useState<ReferralAlert[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const db = getDB();
      const all = await db.assessments
        .filter((a) => a.referralAdvised === true)
        .toArray();
      const seen = getSeenIds();
      const newAlerts: ReferralAlert[] = [];
      for (const a of all) {
        if (!seen.has(a.id)) {
          const patient = a.patientId ? await db.patients.get(a.patientId) : undefined;
          newAlerts.push({ assessment: a, patient: patient ?? undefined });
        }
      }
      newAlerts.sort((a, b) => new Date(b.assessment.createdAt).getTime() - new Date(a.assessment.createdAt).getTime());
      setUnseen(newAlerts);
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh]);

  const markAsSeen = useCallback((assessmentId: string) => {
    const seen = getSeenIds();
    seen.add(assessmentId);
    persistSeenIds(seen);
    setUnseen((prev) => prev.filter((a) => a.assessment.id !== assessmentId));
  }, []);

  const markAllAsSeen = useCallback(() => {
    const seen = getSeenIds();
    for (const a of unseen) seen.add(a.assessment.id);
    persistSeenIds(seen);
    setUnseen([]);
  }, [unseen]);

  return { unseen, count: unseen.length, markAsSeen, markAllAsSeen, refresh };
}
