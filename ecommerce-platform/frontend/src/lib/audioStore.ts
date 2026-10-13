import { create } from 'zustand';
import { persist } from 'zustand/middleware';

let globalAudio: HTMLAudioElement | null = null;
let listenersAttached = false;

export function getGlobalAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!globalAudio) {
    globalAudio = new Audio('/audio/Taj.mp3');
    globalAudio.loop = true;
    globalAudio.volume = 0.4;
    globalAudio.preload = 'auto';

    if (!listenersAttached) {
      globalAudio.addEventListener('play', () => {
        useAudioStore.setState({ isPlaying: true });
      });
      globalAudio.addEventListener('pause', () => {
        useAudioStore.setState({ isPlaying: false });
      });
      globalAudio.addEventListener('ended', () => {
        useAudioStore.setState({ isPlaying: false });
      });
      listenersAttached = true;
    }
  }
  return globalAudio;
}

interface AudioState {
  isMuted: boolean;
  isPlaying: boolean;
  toggleSound: () => void;
  playAudio: () => Promise<void>;
  pauseAudio: () => void;
  setMuted: (val: boolean) => void;
  setIsPlaying: (val: boolean) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      isMuted: false,
      isPlaying: false,

      toggleSound: () => {
        const audio = getGlobalAudio();
        if (!audio) return;

        // If currently playing, pause it and remember user muted it
        if (!audio.paused) {
          audio.pause();
          set({ isPlaying: false, isMuted: true });
        } else {
          // Direct user click - guaranteed user gesture activation
          audio.muted = false;
          audio.play().then(() => {
            set({ isPlaying: true, isMuted: false });
          }).catch((err) => {
            console.warn('[Audio play failed]', err);
            set({ isPlaying: false });
          });
        }
      },

      playAudio: async () => {
        const audio = getGlobalAudio();
        if (!audio) return;
        audio.muted = false;
        try {
          await audio.play();
          set({ isPlaying: true, isMuted: false });
        } catch (err) {
          console.warn('[Audio Autoplay Blocked]', err);
          set({ isPlaying: false });
        }
      },

      pauseAudio: () => {
        const audio = getGlobalAudio();
        if (audio && !audio.paused) {
          audio.pause();
        }
        set({ isPlaying: false });
      },

      setMuted: (val: boolean) => {
        const audio = getGlobalAudio();
        if (audio) {
          if (val) audio.pause();
          else audio.play().catch(() => {});
        }
        set({ isMuted: val, isPlaying: val ? false : get().isPlaying });
      },

      setIsPlaying: (val: boolean) => set({ isPlaying: val }),
    }),
    {
      name: 'marketplace-audio-storage',
      partialize: (state) => ({ isMuted: state.isMuted }),
    }
  )
);
