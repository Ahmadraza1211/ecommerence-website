'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAudioStore } from '@/lib/audioStore';
import { Volume2, VolumeX } from 'lucide-react';

export const BackgroundAudioPlayer = () => {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isMuted, isPlaying, setIsPlaying, toggleMute } = useAudioStore();

  // Active pages for "Taj" background sound
  const isMarketplaceOrProduct = 
    pathname === '/' || 
    pathname?.startsWith('/products') || 
    pathname?.startsWith('/product/');

  useEffect(() => {
    if (!audioRef.current) {
      // Use exact file path case /audio/Taj.mp3
      const audio = new Audio('/audio/Taj.mp3');
      audio.loop = true;
      audio.volume = 0.5;
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    audio.muted = isMuted;

    const tryPlay = () => {
      if (isMarketplaceOrProduct && !isMuted) {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.warn('[Audio Autoplay Blocked]', err);
          setIsPlaying(false);
        });
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    };

    tryPlay();

    // Browser autoplay unlock listener on user interaction
    const handleUserInteraction = () => {
      if (isMarketplaceOrProduct && !isMuted && audio.paused) {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {});
      }
    };

    window.addEventListener('click', handleUserInteraction, { once: true });
    window.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [pathname, isMarketplaceOrProduct, isMuted, setIsPlaying]);

  if (!isMarketplaceOrProduct) return null;

  return null;
};

