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
  isInitialized: boolean;
  screenLocked: boolean;
  setSession: (s: Session | null) => void;
  setLoading: (b: boolean) => void;
  setOfflineSession: (user: OfflineUser) => void;
  setScreenLocked: (locked: boolean) => void;
  clearAuth: () => void;
  setInitialized: (b: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  user: null,
  loading: true,
  offlineUser: null,
  isOfflineAuth: false,
  isInitialized: false,
  screenLocked: false,
  setSession: (session) =>
    set({ session, user: session?.user ?? null, offlineUser: null, isOfflineAuth: false, isInitialized: true }),
  setLoading: (loading) => set({ loading }),
  setOfflineSession: (offlineUser) =>
    set({
      offlineUser,
      isOfflineAuth: true,
      session: null,
      user: { id: offlineUser.id, email: offlineUser.email } as User,
      loading: false,
      isInitialized: true,
    }),
  setScreenLocked: (screenLocked) => set({ screenLocked }),
  clearAuth: () =>
    set({
      session: null,
      user: null,
      offlineUser: null,
      isOfflineAuth: false,
      loading: false,
      isInitialized: true,
    }),
  setInitialized: (b: boolean) => set({ isInitialized: b }),
}));
