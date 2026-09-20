// Maps the stable error messages raised by the seal_letter/claim_letter/open_letter/
// burn_letter SQL functions (see supabase/migrations) to an HTTP status and a small JSON
// body. Deliberately has zero Deno-specific imports so it can be unit tested under the
// app's normal Jest setup, not just exercised indirectly through the SQL test suite.

export interface MappedError {
  status: number;
  body: { error: string };
}

const BAD_REQUEST = new Set([
  'body_text_required',
  'body_text_too_long',
  'stationery_id_required',
  'sender_display_name_required',
  'sender_display_name_too_long',
  'unlock_at_too_soon',
  'unlock_at_too_far',
  'cannot_claim_own_letter',
]);

const CONFLICT = new Set(['already_claimed', 'already_opened']);

export function mapDbErrorMessage(message: string): MappedError {
  if (message === 'letter_not_found') {
    return { status: 404, body: { error: message } };
  }
  if (message === 'forbidden' || message === 'locked') {
    return { status: 403, body: { error: message } };
  }
  if (CONFLICT.has(message)) {
    return { status: 409, body: { error: message } };
  }
  if (BAD_REQUEST.has(message)) {
    return { status: 400, body: { error: message } };
  }
  return { status: 500, body: { error: 'internal_error' } };
}
