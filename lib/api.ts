import { supabase } from './supabase';

export async function invokeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data as T;
}

export type LetterStatus = 'sealed' | 'claimed' | 'opened' | 'burned';

export interface LetterRow {
  id: string;
  token: string;
  sender_id: string;
  recipient_id: string | null;
  status: LetterStatus;
  stationery_id: string;
  sender_display_name: string;
  unlock_at: string;
  sealed_at: string;
  claimed_at: string | null;
  opened_at: string | null;
  reply_to_letter_id: string | null;
}

/** Letters where the signed-in user is the sender or the claimed recipient: exactly what
 * the letters_select_own RLS policy already allows, so this reads the table directly
 * instead of going through an Edge Function. */
export async function listMyLetters(): Promise<LetterRow[]> {
  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .order('unlock_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LetterRow[];
}

export async function getLetter(id: string): Promise<LetterRow | null> {
  const { data, error } = await supabase.from('letters').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as LetterRow | null;
}

/** Whether a reply already exists for this letter, visible to us because we would be its
 * sender (we can only be asking this about a letter we received). */
export async function hasReply(originalLetterId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('letters')
    .select('id')
    .eq('reply_to_letter_id', originalLetterId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export interface SealResult {
  id: string;
  token: string;
  unlockAt: string;
}

export function sealLetter(args: {
  bodyText: string;
  stationeryId: string;
  senderDisplayName: string;
  unlockAt: string;
}): Promise<SealResult> {
  return invokeFunction<SealResult>('seal', args);
}

export function replyToLetter(args: {
  originalLetterId: string;
  bodyText: string;
  stationeryId: string;
  senderDisplayName: string;
  unlockAt: string;
}): Promise<SealResult> {
  return invokeFunction<SealResult>('reply', args);
}

export interface ClaimResult {
  id: string;
  status: LetterStatus;
  unlockAt: string;
  stationeryId: string;
  senderDisplayName: string;
}

export function claimLetter(token: string): Promise<ClaimResult> {
  return invokeFunction<ClaimResult>('claim', { token });
}

export interface OpenResult {
  bodyText: string;
  media: { type: string; durationSeconds?: number; url: string | null }[];
  status: LetterStatus;
  openedAt: string | null;
}

export function openLetter(id: string): Promise<OpenResult> {
  return invokeFunction<OpenResult>('open', { id });
}

export interface BurnResult {
  id: string;
  status: LetterStatus;
}

export function burnLetter(id: string): Promise<BurnResult> {
  return invokeFunction<BurnResult>('burn', { id });
}
