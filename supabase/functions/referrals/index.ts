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
    const status = url.searchParams.get("status");

    let query = supabase
      .from("assessments")
      .select("id, condition, urgency, referral_status, referral_advised, created_at, patients(identifier)")
      .not("referral_status", "eq", "none")
      .order("created_at", { ascending: false })
      .limit(50);

    if (status) {
      query = query.eq("referral_status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return new Response(JSON.stringify(data ?? []), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
