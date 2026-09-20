// Copy to config.js (gitignored, never commit it) once a Supabase project exists. The anon
// key is meant to be public client-side; row level security is the real access control, not
// keeping this secret. See ../supabase/README.md.
window.SEALED_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
};
