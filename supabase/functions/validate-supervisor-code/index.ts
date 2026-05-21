import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ valid: false, error: "Missing code" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data, error } = await supabase
      .from("supervisor_codes")
      .select("code, supervisor_user_id, used_by_user_id, created_at")
      .eq("code", code)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ valid: false, error: "Code not found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (data.used_by_user_id) {
      return new Response(JSON.stringify({ valid: false, error: "Code already used" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("chw_profiles")
      .select("name")
      .eq("user_id", data.supervisor_user_id)
      .single();

    return new Response(
      JSON.stringify({
        valid: true,
        supervisor_name: profile?.name ?? "Supervisor",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ valid: false, error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
