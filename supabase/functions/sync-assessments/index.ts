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
    const assessments = body.assessments;
    if (!Array.isArray(assessments) || assessments.length === 0) {
      return new Response(JSON.stringify({ error: "Missing assessments array" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const mapped = assessments.map((a: Record<string, unknown>) => ({
      id: a.id,
      patient_id: a.patient_id ?? a.patientId,
      chw_user_id: user.user.id,
      images: a.images ?? [],
      condition: a.condition ?? null,
      confidence: a.confidence ?? null,
      urgency: a.urgency ?? null,
      possible_conditions: a.possible_conditions ?? a.possibleConditions ?? null,
      key_visual_features: a.key_visual_features ?? a.keyVisualFeatures ?? null,
      recommendation: a.recommendation ?? null,
      voice_log: a.voice_log ?? a.voiceLog ?? null,
      language: a.language ?? "en-US",
      referral_status: a.referral_status ?? a.referralStatus ?? "none",
      referral_advised: a.referral_advised ?? a.referralAdvised ?? false,
      follow_up_questions: a.follow_up_questions ?? a.followUpQuestions ?? null,
      created_at: a.created_at ?? a.createdAt ?? new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("assessments").upsert(mapped, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, count: mapped.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
