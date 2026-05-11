'use client';

import { motion } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  variant?: 'panel' | 'card' | 'overlay';
  className?: string;
}

export function HolographicOverlay({ children, variant = 'panel', className = '' }: Props) {
  return (
    <div className={`relative ${className}`}>
      {/* Scan lines */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-[inherit]"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 240, 255, 0.015) 2px,
            rgba(0, 240, 255, 0.015) 4px
          )`,
        }}
      />

      {/* Moving scan bar */}
      <motion.div
        className="absolute w-full h-[1px] pointer-events-none z-30 rounded-[inherit]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(0,240,255,0.15) 30%, rgba(0,240,255,0.15) 70%, transparent 100%)',
        }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
      />

      {/* Glow edges */}
      {variant === 'panel' && (
        <div
          className="absolute inset-0 pointer-events-none z-20 rounded-[inherit]"
          style={{
            boxShadow: 'inset 0 0 40px rgba(0,240,255,0.03)',
          }}
        />
      )}

      {children}
    </div>
  );
}
