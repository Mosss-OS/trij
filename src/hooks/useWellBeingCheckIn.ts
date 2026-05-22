import { useState, useEffect } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { 
  hasCompletedThisWeek, 
  saveWellBeingCheckInLocally, 
  syncWellBeingCheckIn,
  calculateWellBeingScore 
} from "@/lib/well-being";
import type { WellBeingCheckIn } from "@/types/trij";

export function useWellBeingCheckIn() {
  const offlineUser = useSessionStore((s) => s.offlineUser);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [hasCheckedThisWeek, setHasCheckedThisWeek] = useState(false);
  const [shouldShowCheckIn, setShouldShowCheckIn] = useState(false);

  useEffect(() => {
    if (!offlineUser) return;

    // Check if user has completed check-in this week
    const completedThisWeek = hasCompletedThisWeek(offlineUser.id);
    setHasCheckedThisWeek(completedThisWeek);

    // Only show check-in if:
    // 1. Haven't completed this week
    // 2. It's been at least 7 days since last check-in
    // We'll trigger this manually after work sessions
  }, [offlineUser]);

  const triggerCheckIn = () => {
    if (!offlineUser || hasCheckedThisWeek) return;
    setShouldShowCheckIn(true);
    setTimeout(() => setShowCheckIn(true), 100); // Small delay for smoother UX
  };

  const handleSubmit = (responses: [number, number, number]) => {
    if (!offlineUser) return;

    const score = calculateWellBeingScore(responses);
    const weekStart = getWeekStart(new Date());

    const checkIn: WellBeingCheckIn = {
      id: `wb-${offlineUser.id}-${weekStart}-${Date.now()}`,
      chwUserId: offlineUser.id,
      weekStartDate: weekStart,
      responses,
      score,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Save locally first
    saveWellBeingCheckInLocally(checkIn);
    
    // Try to sync in background
    syncWellBeingCheckIn(checkIn).catch(console.error);

    setHasCheckedThisWeek(true);
    setShowCheckIn(false);
    setShouldShowCheckIn(false);
  };

  const handleSkip = () => {
    setShowCheckIn(false);
    setShouldShowCheckIn(false);
  };

  return {
    showCheckIn,
    shouldShowCheckIn,
    hasCheckedThisWeek,
    triggerCheckIn,
    handleSubmit,
    handleSkip,
  };
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}