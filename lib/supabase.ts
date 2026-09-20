import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// A placeholder URL/key keep createClient from throwing when the app isn't configured yet
// (no live Supabase project, see supabase/README.md); every call still fails, but the app
// renders instead of crashing on import. Callers should check isSupabaseConfigured first.
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  { auth: { persistSession: false } }
);
