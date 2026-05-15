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

    const url = new URL(req.url);
    const since = url.searchParams.get("since") ?? new Date(0).toISOString();

    const [assessments, patients] = await Promise.all([
      supabase
        .from("assessments")
        .select("*")
        .eq("chw_user_id", user.user.id)
        .gte("synced_at", since)
        .order("synced_at", { ascending: true }),
      supabase
        .from("patients")
        .select("*")
        .eq("chw_user_id", user.user.id)
        .gte("updated_at", since)
        .order("updated_at", { ascending: true }),
    ]);

    return new Response(
      JSON.stringify({
        assessments: assessments.data ?? [],
        patients: patients.data ?? [],
        serverTime: new Date().toISOString(),
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
