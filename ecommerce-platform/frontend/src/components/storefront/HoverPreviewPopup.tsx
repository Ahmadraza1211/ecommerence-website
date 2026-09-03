'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * PRD_New V3 §Marketplace.5: Hover preview popup.
 * Hovering over a child element for 3 seconds shows a centered preview popup.
 * Moving the mouse away dismisses it immediately.
 */
export function HoverPreviewPopup({
  children,
  mainImage,
  secondaryImage,
  title,
  price,
}: {
  children: ReactNode;
  mainImage?: string;
  secondaryImage?: string;
  title: string;
  price: string;
}) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const childRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  function handleMouseEnter() {
    timerRef.current = setTimeout(() => setVisible(true), 3000);
  }
  function handleMouseLeave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }

  return (
    <>
      <div ref={childRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative">
        {children}
      </div>
      {mounted && visible && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
        >
          <div className="card p-4 max-w-sm w-[90%] animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-3">
              <div className="h-24 w-24 rounded-xl overflow-hidden bg-ink-100 shrink-0">
                {mainImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mainImage} alt={title} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm line-clamp-2">{title}</h3>
                <p className="font-display font-bold text-lg text-brand-600 mt-1">{price}</p>
              </div>
            </div>
            {secondaryImage && (
              <div className="mt-3 h-32 rounded-xl overflow-hidden bg-ink-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={secondaryImage} alt="" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
