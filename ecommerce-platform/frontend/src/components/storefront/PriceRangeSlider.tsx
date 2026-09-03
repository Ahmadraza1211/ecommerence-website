'use client';

import { useState, useRef, useEffect } from 'react';

interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: { min: number; max: number };
  onChange: (value: { min: number; max: number }) => void;
}

/**
 * PRD_New §Marketplace.5: dual-thumb price range slider.
 * Built with two overlapping range inputs for cross-browser compatibility.
 */
export function PriceRangeSlider({ min, max, value, onChange }: PriceRangeSliderProps) {
  const [local, setLocal] = useState(value);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocal(value); }, [value.min, value.max]);

  const range = max - min;
  const leftPct = range > 0 ? ((local.min - min) / range) * 100 : 0;
  const rightPct = range > 0 ? 100 - ((local.max - min) / range) * 100 : 0;

  function commit() {
    onChange(local);
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between text-xs text-ink-600 mb-2">
        <span>Min: <strong className="text-ink-900">PKR {local.min.toLocaleString()}</strong></span>
        <span>Max: <strong className="text-ink-900">PKR {local.max.toLocaleString()}</strong></span>
      </div>
      <div ref={trackRef} className="relative h-6 flex items-center">
        {/* Track */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-ink-200" />
        {/* Selected range */}
        <div
          className="absolute h-1.5 rounded-full bg-brand-500"
          style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={local.min}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), local.max - 1);
            setLocal((s) => ({ ...s, min: v }));
          }}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none z-20
            [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-600
            [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-brand-600 [&::-moz-range-thumb]:cursor-pointer"
          aria-label="Minimum price"
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={local.max}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), local.min + 1);
            setLocal((s) => ({ ...s, max: v }));
          }}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none z-20
            [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-600
            [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-brand-600 [&::-moz-range-thumb]:cursor-pointer"
          aria-label="Maximum price"
        />
      </div>
    </div>
  );
}
