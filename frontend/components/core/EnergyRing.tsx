'use client';

import { motion } from 'framer-motion';

interface Props {
  color?: string;
  size?: number;
  repeat?: number;
  delay?: number;
  className?: string;
}

export default function EnergyRing({
  color = '#00F0FF',
  size = 200,
  repeat = Infinity,
  delay = 0,
  className = '',
}: Props) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
      {[0, 0.4, 0.8].map((offset, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            borderColor: color,
            borderWidth: 1,
          }}
          initial={{ scale: 0.3, opacity: 0.6 }}
          animate={{
            scale: [0.3, 1.5, 2],
            opacity: [0.4, 0.15, 0],
          }}
          transition={{
            duration: 2.5,
            repeat,
            delay: delay + offset,
            ease: 'easeOut',
            repeatDelay: repeat === Infinity ? 0.5 : 0,
          }}
        />
      ))}
    </div>
  );
}
