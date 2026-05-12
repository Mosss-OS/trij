import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

interface SessionState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  setSession: (s: Session | null) => void;
  setLoading: (b: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  user: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setLoading: (loading) => set({ loading }),
}));
