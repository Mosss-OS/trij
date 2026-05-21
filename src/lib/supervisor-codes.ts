import { supabase } from "@/integrations/supabase/client";

const EDGE_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, "")}/functions/v1`
  : "";

export interface CodeValidationResult {
  valid: boolean;
  supervisor_name?: string;
  error?: string;
}

export async function validateSupervisorCode(code: string): Promise<CodeValidationResult> {
  try {
    const res = await fetch(`${EDGE_URL}/validate-supervisor-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    return await res.json();
  } catch {
    return { valid: false, error: "Could not validate code. Check your connection." };
  }
}
