import { create } from 'zustand';

export type CoreState = 'idle' | 'thinking' | 'speaking' | 'executing';
export type CoreMood = 'neutral' | 'focused' | 'alert' | 'processing';

interface CoreStore {
  state: CoreState;
  mood: CoreMood;
  energy: number;
  connected: boolean;
  booted: boolean;
  setState: (state: CoreState) => void;
  setMood: (mood: CoreMood) => void;
  setEnergy: (energy: number) => void;
  setConnected: (connected: boolean) => void;
  setBooted: (booted: boolean) => void;
}

export const useCoreStore = create<CoreStore>((set) => ({
  state: 'idle',
  mood: 'neutral',
  energy: 0.5,
  connected: false,
  booted: false,
  setState: (state) => set({ state }),
  setMood: (mood) => set({ mood }),
  setEnergy: (energy) => set({ energy }),
  setConnected: (connected) => set({ connected }),
  setBooted: (booted) => set({ booted }),
}));
