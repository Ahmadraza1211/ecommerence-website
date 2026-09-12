'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAudioStore } from '@/lib/audioStore';

export const BackgroundAudioPlayer = () => {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isMuted, setIsPlaying } = useAudioStore();

  // Active pages for "Taj" background sound
  const isMarketplaceOrProduct = 
    pathname === '/' || 
    pathname.startsWith('/products') || 
    pathname.startsWith('/product/');

  useEffect(() => {
    if (!audioRef.current) {
      // Audio element supporting taj.mp3 or uploaded audio
      const audio = new Audio('/audio/taj.mp3');
      audio.loop = true;
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    audio.muted = isMuted;

    if (isMarketplaceOrProduct && !isMuted) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Browser autoplay policy catch - waiting for user interaction
        setIsPlaying(false);
      });
    } else {
      audio.pause();
      setIsPlaying(false);
    }

    return () => {
      // Pause if component unmounts
    };
  }, [pathname, isMarketplaceOrProduct, isMuted, setIsPlaying]);

  return null;
};
