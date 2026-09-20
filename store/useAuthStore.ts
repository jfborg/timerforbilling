import { create } from 'zustand';

import { supabase } from '../lib/supabase';

// Anonymous auth first (standing rules): every screen that needs a caller id goes through
// ensureSignedIn() rather than assuming a session already exists.
type AuthState = {
  userId: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  ensureSignedIn: () => Promise<string | null>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  status: 'idle',
  error: null,
  ensureSignedIn: async () => {
    const current = get();
    if (current.status === 'ready' && current.userId) return current.userId;

    set({ status: 'loading', error: null });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let uid = sessionData.session?.user.id ?? null;

      if (!uid) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        uid = data.user?.id ?? null;
      }

      set({ userId: uid, status: 'ready' });
      return uid;
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },
}));
