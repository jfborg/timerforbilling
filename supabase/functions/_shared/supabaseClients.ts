// Two Supabase clients per request: one scoped to the caller's own JWT (only used to verify
// who they are), and one using the service_role key (the only key with execute rights on the
// seal_letter/claim_letter/open_letter/burn_letter functions). Never use the service-role
// client to decide who the caller is; that decision always goes through the caller's own JWT.

// @deno-types="npm:@supabase/supabase-js@2"
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function createCallerClient(authHeader: string): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

export function createAdminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

/** Verifies the caller's JWT and returns their user id, or null if it's missing/invalid. */
export async function getCallerId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const callerClient = createCallerClient(authHeader);
  const { data, error } = await callerClient.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}
