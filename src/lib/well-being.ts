import type { WellBeingCheckIn, WellBeingTrend, SupportResource, WellBeingAggregate } from "@/types/trij";
import { supabase } from "@/integrations/supabase/client";

const WELL_BEING_STORE = "trij-well-being";
const SUPPORT_RESOURCES_STORE = "trij-support-resources";

// Local storage functions
export function saveWellBeingCheckInLocally(checkIn: WellBeingCheckIn): void {
  const existing = getWellBeingCheckInsLocally();
  existing.push(checkIn);
  localStorage.setItem(WELL_BEING_STORE, JSON.stringify(existing));
}

export function getWellBeingCheckInsLocally(): WellBeingCheckIn[] {
  const data = localStorage.getItem(WELL_BEING_STORE);
  return data ? JSON.parse(data) : [];
}

export function getLatestWellBeingCheckIn(chwUserId: string): WellBeingCheckIn | null {
  const checkIns = getWellBeingCheckInsLocally();
  const userCheckIns = checkIns
    .filter(c => c.chwUserId === chwUserId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return userCheckIns.length > 0 ? userCheckIns[0] : null;
}

export function hasCompletedThisWeek(chwUserId: string): boolean {
  const latest = getLatestWellBeingCheckIn(chwUserId);
  if (!latest) return false;
  
  const checkInDate = new Date(latest.timestamp);
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return checkInDate >= oneWeekAgo;
}

// Supabase sync functions
export async function syncWellBeingCheckIn(checkIn: WellBeingCheckIn): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('wellbeing_checkins')
      .insert({
        id: checkIn.id,
        chw_user_id: checkIn.chwUserId,
        week_start_date: checkIn.weekStartDate,
        responses: checkIn.responses,
        score: checkIn.score,
        timestamp: checkIn.timestamp,
        created_at: checkIn.createdAt,
        synced_at: new Date().toISOString(),
      });

    if (error) throw error;

    // Update local copy with sync status
    const existing = getWellBeingCheckInsLocally();
    const updated = existing.map(c => 
      c.id === checkIn.id ? { ...c, syncedAt: new Date().toISOString() } : c
    );
    localStorage.setItem(WELL_BEING_STORE, JSON.stringify(updated));

    return true;
  } catch (error) {
    console.error('Failed to sync well-being check-in:', error);
    return false;
  }
}

export async function syncPendingWellBeingCheckIns(chwUserId: string): Promise<void> {
  const checkIns = getWellBeingCheckInsLocally();
  const pending = checkIns.filter(c => c.chwUserId === chwUserId && !c.syncedAt);
  
  for (const checkIn of pending) {
    await syncWellBeingCheckIn(checkIn);
  }
}

// Trend analysis functions
export function calculateWellBeingTrend(chwUserId: string): WellBeingTrend | null {
  const checkIns = getWellBeingCheckInsLocally()
    .filter(c => c.chwUserId === chwUserId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (checkIns.length < 2) return null;

  const currentScore = checkIns[checkIns.length - 1].score;
  const previousScore = checkIns[checkIns.length - 2].score;
  
  let trend: "improving" | "stable" | "declining";
  const scoreDiff = currentScore - previousScore;
  
  if (scoreDiff >= 10) trend = "improving";
  else if (scoreDiff <= -10) trend = "declining";
  else trend = "stable";

  return {
    chwUserId,
    chwName: "", // Will be filled by caller
    currentScore,
    previousScore,
    trend,
    weeksTracked: checkIns.length,
    lastCheckIn: checkIns[checkIns.length - 1].timestamp,
  };
}

export function getDecliningTrendCHWs(allTrends: WellBeingTrend[]): WellBeingTrend[] {
  return allTrends.filter(t => 
    t.trend === "declining" && 
    t.weeksTracked >= 2
  );
}

// Support resources functions
export function saveSupportResourcesLocally(resources: SupportResource[]): void {
  localStorage.setItem(SUPPORT_RESOURCES_STORE, JSON.stringify(resources));
}

export function getSupportResourcesLocally(): SupportResource[] {
  const data = localStorage.getItem(SUPPORT_RESOURCES_STORE);
  return data ? JSON.parse(data) : [];
}

export function getSupportResourcesByCategory(category: SupportResource['category']): SupportResource[] {
  const resources = getSupportResourcesLocally();
  return resources.filter(r => r.category === category);
}

// Aggregate reporting (anonymous)
export async function getWellBeingAggregate(startDate: string, endDate: string): Promise<WellBeingAggregate | null> {
  try {
    const { data, error } = await supabase
      .from('wellbeing_checkins')
      .select('score, timestamp')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const scores = data.map(d => d.score);
    const totalCheckIns = scores.length;
    const averageScore = scores.reduce((a, b) => a + b, 0) / totalCheckIns;

    const distribution = {
      high: scores.filter(s => s >= 75).length,
      medium: scores.filter(s => s >= 50 && s < 75).length,
      low: scores.filter(s => s < 50).length,
    };

    // Calculate week-over-week averages
    const weekData: { [key: string]: number[] } = {};
    data.forEach(d => {
      const week = getWeekStart(new Date(d.timestamp));
      if (!weekData[week]) weekData[week] = [];
      weekData[week].push(d.score);
    });

    const weekOverWeek = Object.entries(weekData).map(([week, scores]) => ({
      week,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    })).sort((a, b) => a.week.localeCompare(b.week));

    return {
      totalCheckIns,
      averageScore,
      distribution,
      weekOverWeek,
    };
  } catch (error) {
    console.error('Failed to fetch well-being aggregate:', error);
    return null;
  }
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Calculate well-being score from responses (0-100 scale)
// WHO-5 uses: score = ((sum of responses - 5) / 20) * 100
// Adapted for 3 questions: score = ((sum of responses - 3) / 12) * 100
export function calculateWellBeingScore(responses: [number, number, number]): number {
  const sum = responses.reduce((a, b) => a + b, 0);
  const score = ((sum - 3) / 12) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}