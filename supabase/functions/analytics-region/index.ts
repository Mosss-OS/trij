import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: user, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user.user) return new Response("Unauthorized", { status: 401 });

    const [assessments, conditions, trends] = await Promise.all([
      supabase
        .from("assessments")
        .select("urgency", { count: "exact", head: false })
        .or(`chw_user_id.eq.${user.user.id},referral_status.neq.none`),
      supabase
        .from("assessments")
        .select("condition, urgency", { count: "exact", head: false })
        .not("condition", "is", null)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("assessments")
        .select("created_at, urgency")
        .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
        .order("created_at", { ascending: true }),
    ]);

    const urgencyCounts = { green: 0, yellow: 0, red: 0 };
    for (const a of assessments.data ?? []) {
      if (a.urgency && a.urgency in urgencyCounts) urgencyCounts[a.urgency as keyof typeof urgencyCounts]++;
    }

    const conditionFreq: Record<string, number> = {};
    for (const a of conditions.data ?? []) {
      if (a.condition) conditionFreq[a.condition] = (conditionFreq[a.condition] || 0) + 1;
    }
    const topConditions = Object.entries(conditionFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const dailyTrend: Record<string, { green: number; yellow: number; red: number }> = {};
    for (const a of trends.data ?? []) {
      if (!a.created_at) continue;
      const day = a.created_at.slice(0, 10);
      if (!dailyTrend[day]) dailyTrend[day] = { green: 0, yellow: 0, red: 0 };
      if (a.urgency && a.urgency in dailyTrend[day]) dailyTrend[day][a.urgency as keyof typeof dailyTrend[day]]++;
    }

    return new Response(
      JSON.stringify({
        total: assessments.count ?? 0,
        byUrgency: urgencyCounts,
        topConditions,
        dailyTrend: Object.entries(dailyTrend).map(([date, counts]) => ({ date, ...counts })),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
