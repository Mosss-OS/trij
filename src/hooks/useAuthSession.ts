import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionStore } from "@/stores/sessionStore";

const SESSION_TIMEOUT = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms)),
  ]);
}

export function useAuthSession() {
  const { setSession, setLoading } = useSessionStore();
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const result = supabase.auth.onAuthStateChange((_event, session) => {
        if (cancelled) return;
        setLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
        if (session) setSession(session);
      });
      subscription = result.data.subscription;
    } catch {
      setLoading(false);
      return;
    }

    timeoutId = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        console.warn("[Auth] getSession timed out, proceeding without session");
      }
    }, SESSION_TIMEOUT);

    withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT)
      .then(({ data: { session } }) => {
        if (cancelled) return;
        if (timeoutId) clearTimeout(timeoutId);
        setLoading(false);
        if (session) setSession(session);
      })
      .catch((err) => {
        if (cancelled) return;
        if (timeoutId) clearTimeout(timeoutId);
        setLoading(false);
        console.warn("[Auth] getSession failed:", err);
      });

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, [setSession, setLoading]);
}
