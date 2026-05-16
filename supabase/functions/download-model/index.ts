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
    const modelId = url.searchParams.get("model") ?? "gemma-4-E2B-it-q4f16_1-MLC";

    const { data, error } = await supabase
      .from("model_registry")
      .select("*")
      .eq("model_id", modelId)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: "Model not found", model: modelId }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
