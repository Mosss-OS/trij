import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/clear-users" as never)({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_TOKEN;

        if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
          return new Response(JSON.stringify({ error: "Server misconfigured — SERVICE_ROLE_KEY not set" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: users, error: listErr } = await admin.auth.admin.listUsers();
        if (listErr) {
          return new Response(JSON.stringify({ error: listErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let deleted = 0;
        const errors: string[] = [];
        for (const u of users.users) {
          const { error } = await admin.auth.admin.deleteUser(u.id);
          if (error) errors.push(error.message);
          else deleted++;
        }

        return new Response(JSON.stringify({ deleted, errors: errors.length ? errors : undefined }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
