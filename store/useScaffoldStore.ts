import { create } from 'zustand';

type ScaffoldState = {
  pingCount: number;
  ping: () => void;
};

// Proves the Zustand wiring works end to end; real stores arrive with Phase 1+ features.
export const useScaffoldStore = create<ScaffoldState>((set) => ({
  pingCount: 0,
  ping: () => set((state) => ({ pingCount: state.pingCount + 1 })),
}));
