'use client';

import { useState, useCallback } from 'react';

/**
 * PRD_New V3 §Product Page.1: Add to Cart animation.
 * On click, animates a small copy of the product image flying from the
 * Add-to-Cart button toward the floating cart icon (lower-right), then fades out.
 *
 * Usage: call the returned `triggerAnimation` function with the image URL
 * and the source button's bounding rect.
 */
export function useAddToCartAnimation() {
  const [flyingImage, setFlyingImage] = useState<{
    url: string;
    startX: number;
    startY: number;
    key: number;
  } | null>(null);

  const triggerAnimation = useCallback((imageUrl: string, sourceRect: DOMRect) => {
    setFlyingImage({
      url: imageUrl,
      startX: sourceRect.left + sourceRect.width / 2,
      startY: sourceRect.top + sourceRect.height / 2,
      key: Date.now(),
    });
    // Remove after animation completes
    setTimeout(() => setFlyingImage(null), 800);
  }, []);

  const AnimationElement = flyingImage ? (
    <div
      key={flyingImage.key}
      className="fixed z-[100] pointer-events-none"
      style={{
        left: `${flyingImage.startX}px`,
        top: `${flyingImage.startY}px`,
        animation: 'flyToCart 0.8s ease-in forwards',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flyingImage.url}
        alt=""
        className="h-12 w-12 rounded-lg object-cover shadow-lg"
      />
      <style>{`
        @keyframes flyToCart {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(calc(50vw - 50%), calc(50vh - 50%)) scale(0.8); opacity: 0.8; }
          100% {
            transform: translate(calc(100vw - 4rem - 50%), calc(100vh - 6rem - 50%)) scale(0.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  ) : null;

  return { triggerAnimation, AnimationElement };
}
