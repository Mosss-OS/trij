import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface InferenceBody {
  image: string;
  prompt: string;
  language: string;
  ragContext?: string;
}

interface TriageResult {
  condition: string;
  confidence: number;
  urgency: "green" | "yellow" | "red";
  possible_conditions: Array<{ name: string; probability: number }>;
  key_visual_features: string[];
  recommendation: string;
  referral_advised: boolean;
  follow_up_questions: string[];
}

const HF_API_URL = "https://api-inference.huggingface.co/models/google/gemma-4-26b-a4b-it";
const MAX_INFERENCES_PER_DAY = 50;

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user?.user) return new Response("Unauthorized", { status: 401 });

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body: InferenceBody = await req.json();
    if (!body.image || !body.prompt) {
      return new Response(JSON.stringify({ error: "Missing image or prompt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const hfToken = Deno.env.get("HF_API_TOKEN");
    if (!hfToken) {
      return new Response(JSON.stringify({ error: "Cloud inference not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { count: current } = await supabase
      .from("inference_quota")
      .select("count")
      .eq("user_id", user.user.id)
      .eq("date", today)
      .maybeSingle()
      .then((r) => r.data ?? { count: 0 });
    if (current >= MAX_INFERENCES_PER_DAY) {
      return new Response(JSON.stringify({ error: "Daily quota exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ragSection = body.ragContext
      ? `\n\nReference medical knowledge (use these for grounded recommendations):\n${body.ragContext}`
      : "";
    const systemPrompt = `You are a medical triage assistant. Analyze the image and provide a structured assessment.
Return a JSON object with:
- condition: the most likely diagnosis
- confidence: 0-100 score
- urgency: "green" (routine), "yellow" (soon), or "red" (urgent)
- possible_conditions: array of {name, probability} for differentials
- key_visual_features: array of visible symptoms
- recommendation: clear treatment/referral instruction
- referral_advised: boolean
- follow_up_questions: array of strings
Language: ${body.language}${ragSection}`;

    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: body.image } },
                { type: "text", text: body.prompt },
              ],
            },
          ],
        },
        parameters: {
          max_tokens: 800,
          temperature: 0.1,
          return_full_text: false,
        },
      }),
    });

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      console.error("HF inference error:", hfResponse.status, errText);
      return new Response(JSON.stringify({ error: "Inference failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const hfData = await hfResponse.json();
    const raw = hfData.choices?.[0]?.message?.content || hfData[0]?.generated_text || "";

    let result: TriageResult;
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      result = {
        condition: parsed.condition || "Unknown",
        confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
        urgency: ["green", "yellow", "red"].includes(parsed.urgency) ? parsed.urgency : "yellow",
        possible_conditions: parsed.possible_conditions || [],
        key_visual_features: parsed.key_visual_features || [],
        recommendation: parsed.recommendation || "",
        referral_advised: !!parsed.referral_advised,
        follow_up_questions: parsed.follow_up_questions || [],
      };
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse model response" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("inference_quota")
      .upsert(
        { user_id: user.user.id, date: today, count: current + 1 },
        { onConflict: "user_id,date" },
      );

    console.log(`Inference by user ${user.user.id.slice(0, 8)}: ${result.condition} (${result.confidence}%)`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("infer-gemma4 error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
