import { create } from 'zustand';

// A fresh letter or a reply, held here between the compose, seal, and share/sent screens so
// they don't need to pass long text through router params.
type ComposeDraft = {
  bodyText: string;
  senderDisplayName: string;
  stationeryId: string;
  unlockAt: string | null; // ISO, chosen on the compose screen
  replyToLetterId: string | null; // set only when writing back
  replyToSenderDisplayName: string | null; // for the "replying to X" hint
};

type ComposeState = ComposeDraft & {
  setField: <K extends keyof ComposeDraft>(key: K, value: ComposeDraft[K]) => void;
  startFresh: () => void;
  startReply: (originalLetterId: string, originalSenderDisplayName: string) => void;
  reset: () => void;
};

const emptyDraft: ComposeDraft = {
  bodyText: '',
  senderDisplayName: '',
  stationeryId: 'classic-cream',
  unlockAt: null,
  replyToLetterId: null,
  replyToSenderDisplayName: null,
};

export const useComposeStore = create<ComposeState>((set) => ({
  ...emptyDraft,
  setField: (key, value) => set({ [key]: value } as Partial<ComposeState>),
  startFresh: () => set({ ...emptyDraft }),
  startReply: (originalLetterId, originalSenderDisplayName) =>
    set({
      ...emptyDraft,
      replyToLetterId: originalLetterId,
      replyToSenderDisplayName: originalSenderDisplayName,
    }),
  reset: () => set({ ...emptyDraft }),
}));
