import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

export interface OfflineUser {
  id: string;
  email: string;
}

interface SessionState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  offlineUser: OfflineUser | null;
  isOfflineAuth: boolean;
  setSession: (s: Session | null) => void;
  setLoading: (b: boolean) => void;
  setOfflineSession: (user: OfflineUser) => void;
  clearAuth: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  user: null,
  loading: true,
  offlineUser: null,
  isOfflineAuth: false,
  setSession: (session) =>
    set({ session, user: session?.user ?? null, offlineUser: null, isOfflineAuth: false }),
  setLoading: (loading) => set({ loading }),
  setOfflineSession: (offlineUser) =>
    set({ offlineUser, isOfflineAuth: true, session: null, user: null, loading: false }),
  clearAuth: () =>
    set({
      session: null,
      user: null,
      offlineUser: null,
      isOfflineAuth: false,
      loading: false,
    }),
}));
