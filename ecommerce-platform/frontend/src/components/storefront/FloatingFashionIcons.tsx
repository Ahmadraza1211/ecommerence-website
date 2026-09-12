'use client';

import React, { useEffect, useState } from 'react';
import { 
  Shirt, 
  ShoppingBag, 
  Crown, 
  Gem, 
  Scissors, 
  Sparkles, 
  Watch, 
  Glasses, 
  Footprints,
  Tag
} from 'lucide-react';

interface FloatingIcon {
  id: number;
  Icon: React.ElementType;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

const ICON_LIST = [Shirt, ShoppingBag, Crown, Gem, Scissors, Sparkles, Watch, Glasses, Footprints, Tag];

export const FloatingFashionIcons: React.FC = () => {
  const [icons, setIcons] = useState<FloatingIcon[]>([]);

  useEffect(() => {
    // Generate 14 floating background fashion icons
    const generatedIcons: FloatingIcon[] = Array.from({ length: 14 }).map((_, index) => ({
      id: index,
      Icon: ICON_LIST[index % ICON_LIST.length],
      x: Math.floor(Math.random() * 85) + 5, // 5% to 90%
      y: Math.floor(Math.random() * 85) + 5, // 5% to 90%
      size: Math.floor(Math.random() * 12) + 16, // 16px to 28px
      duration: Math.floor(Math.random() * 10) + 18, // 18s to 28s smooth motion
      delay: Math.random() * 5,
      opacity: Math.random() * 0.15 + 0.1, // subtle 10-25% opacity
    }));

    setIcons(generatedIcons);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {icons.map((item) => {
        const IconComponent = item.Icon;
        return (
          <div
            key={item.id}
            className="absolute transition-transform ease-in-out animate-pulse"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              opacity: item.opacity,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`,
              transform: `scale(1.0)`,
            }}
          >
            <div 
              className="text-brand-500 dark:text-amber-400/60 transition-colors"
              style={{
                animation: `floatAround ${item.duration}s infinite ease-in-out alternate`,
              }}
            >
              <IconComponent style={{ width: item.size, height: item.size }} />
            </div>
          </div>
        );
      })}

      <style jsx global>{`
        @keyframes floatAround {
          0% {
            transform: translate(0px, 0px) rotate(0deg);
          }
          33% {
            transform: translate(35px, -45px) rotate(15deg);
          }
          66% {
            transform: translate(-30px, 35px) rotate(-12deg);
          }
          100% {
            transform: translate(40px, -20px) rotate(20deg);
          }
        }
      `}</style>
    </div>
  );
};
