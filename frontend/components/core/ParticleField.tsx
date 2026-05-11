'use client';

import { useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  drift: number;
  color: string;
}

interface Props {
  count?: number;
  className?: string;
}

export default function ParticleField({ count = 80, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const particles = useMemo(() => {
    const colors = ['rgba(0,240,255', 'rgba(30,144,255', 'rgba(0,255,209'];
    return Array.from({ length: count }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.2,
      opacity: Math.random() * 0.4 + 0.1,
      drift: (Math.random() - 0.5) * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, [count]);

  return (
    <div ref={containerRef} className={`pointer-events-none overflow-hidden ${className}`}>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color + `,${p.opacity})`,
            boxShadow: `0 0 ${p.size * 3}px ${p.color},${p.opacity * 0.5})`,
          }}
          animate={{
            y: [`${p.y}%`, `${p.y - 15}%`, `${p.y}%`],
            x: [`${p.x}%`, `${p.x + p.drift * 10}%`, `${p.x}%`],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: 4 + p.speed * 8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}
