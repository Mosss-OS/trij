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

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const patients = body.patients;
    if (!Array.isArray(patients) || patients.length === 0) {
      return new Response(JSON.stringify({ error: "Missing patients array" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const mapped = patients.map((p: Record<string, unknown>) => ({
      id: p.id,
      chw_user_id: user.user.id,
      identifier: p.identifier ?? "",
      age_years: p.age_years ?? p.ageYears ?? null,
      sex: p.sex ?? null,
      location_lat: p.location_lat ?? p.locationLat ?? null,
      location_lng: p.location_lng ?? p.locationLng ?? null,
      notes: p.notes ?? null,
      created_at: p.created_at ?? p.createdAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("patients").upsert(mapped, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, count: mapped.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
