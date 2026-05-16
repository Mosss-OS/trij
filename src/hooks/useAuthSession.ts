import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionStore } from "@/stores/sessionStore";

export function useAuthSession() {
  const { setSession, setLoading } = useSessionStore();
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let cancelled = false;

    try {
      const result = supabase.auth.onAuthStateChange((_event, session) => {
        if (cancelled) return;
        setLoading(false);
        if (session) setSession(session);
      });
      subscription = result.data.subscription;
    } catch {
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        setLoading(false);
        if (session) setSession(session);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [setSession, setLoading]);
}
