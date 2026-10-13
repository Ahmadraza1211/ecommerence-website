'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAudioStore, getGlobalAudio } from '@/lib/audioStore';

export const BackgroundAudioPlayer = () => {
  const pathname = usePathname();
  const { isMuted, playAudio, pauseAudio } = useAudioStore();

  const isMarketplaceOrProduct =
    pathname === '/' ||
    pathname?.startsWith('/products') ||
    pathname?.startsWith('/product/');

  useEffect(() => {
    const audio = getGlobalAudio();
    if (!audio) return;

    if (isMarketplaceOrProduct && !isMuted) {
      // Attempt autoplay
      audio.play().then(() => {
        useAudioStore.setState({ isPlaying: true });
      }).catch(() => {
        // Autoplay blocked by browser until user interaction
        useAudioStore.setState({ isPlaying: false });

        const handleInteraction = () => {
          const currentStore = useAudioStore.getState();
          if (!currentStore.isMuted) {
            audio.play().then(() => {
              useAudioStore.setState({ isPlaying: true });
            }).catch(() => {});
          }
          window.removeEventListener('click', handleInteraction);
          window.removeEventListener('touchstart', handleInteraction);
        };

        window.addEventListener('click', handleInteraction, { once: true });
        window.addEventListener('touchstart', handleInteraction, { once: true });
      });
    } else {
      audio.pause();
      useAudioStore.setState({ isPlaying: false });
    }
  }, [pathname, isMarketplaceOrProduct, isMuted]);

  return null;
};
