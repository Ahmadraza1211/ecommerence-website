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

  return (
    <button
      type="button"
      onClick={toggleMute}
      title={isMuted ? 'Unmute Taj Audio' : 'Mute Taj Audio'}
      className="fixed bottom-20 right-4 z-40 p-3 rounded-full bg-amber-500 text-slate-950 shadow-lg hover:bg-amber-400 transition-all border border-amber-300 flex items-center justify-center group"
    >
      {isMuted ? (
        <VolumeX className="h-5 w-5 text-slate-900" />
      ) : (
        <Volume2 className="h-5 w-5 text-slate-950 animate-pulse" />
      )}
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-bold pl-0 group-hover:pl-2">
        {isMuted ? 'Play Audio' : 'Audio Playing'}
      </span>
    </button>
  );
};

