'use client';

import { motion } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className = '' }: Props) {
  return (
    <motion.div
      className={`glass-panel ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

export function GlowingBorder({ children, className = '' }: Props) {
  return (
    <div className={`glowing-border ${className}`}>
      {children}
    </div>
  );
}

export function NeonText({ children, className = '', dim = false }: Props & { dim?: boolean }) {
  return (
    <span className={dim ? 'neon-text-dim' : 'neon-text' + ' ' + className}>
      {children}
    </span>
  );
}
