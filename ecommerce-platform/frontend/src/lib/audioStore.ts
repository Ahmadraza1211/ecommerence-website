import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AudioState {
  isMuted: boolean;
  isPlaying: boolean;
  toggleMute: () => void;
  setMuted: (val: boolean) => void;
  setIsPlaying: (val: boolean) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      isMuted: false,
      isPlaying: false,
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      setMuted: (val: boolean) => set({ isMuted: val }),
      setIsPlaying: (val: boolean) => set({ isPlaying: val }),
    }),
    {
      name: 'marketplace-audio-storage',
    }
  )
);
