import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      return new Response(JSON.stringify({ error: listErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ids = users.users.map((u) => u.id);
    let deleted = 0;
    const errors: string[] = [];

    for (const id of ids) {
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) errors.push(`${id}: ${error.message}`);
      else deleted++;
    }

    return new Response(
      JSON.stringify({ deleted, errors: errors.length ? errors : undefined }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
