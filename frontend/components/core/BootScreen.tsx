'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface BootScreenProps {
  onBootComplete: () => void;
}

export default function BootScreen({ onBootComplete }: BootScreenProps) {
  const [bootPhase, setBootPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setBootPhase(1), 800),
      setTimeout(() => setBootPhase(2), 2000),
      setTimeout(() => setBootPhase(3), 3500),
      setTimeout(() => {
        setBootPhase(4);
        setTimeout(onBootComplete, 600);
      }, 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onBootComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-space-black overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Scan line overlay */}
      <div className="scan-line" />

      {/* Central content */}
      <motion.div
        className="relative flex flex-col items-center gap-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* AI Core Orb */}
        <motion.div
          className="relative w-32 h-32"
          animate={{
            scale: bootPhase === 3 ? [1, 1.05, 1] : 1,
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-neon-cyan/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border border-neon-cyan/10"
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          />

          {/* Core */}
          <motion.div
            className="absolute inset-4 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0,240,255,0.3) 0%, rgba(0,240,255,0.05) 50%, transparent 70%)',
              boxShadow: bootPhase >= 2
                ? '0 0 60px rgba(0,240,255,0.4), 0 0 120px rgba(0,240,255,0.1)'
                : '0 0 30px rgba(0,240,255,0.2)',
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>

        {/* System Name */}
        <motion.div className="text-center">
          <motion.h1
            className="text-5xl font-bold tracking-[0.3em] neon-text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            KRATOS
          </motion.h1>
          <motion.p
            className="text-sm text-neon-cyan/50 tracking-[0.5em] mt-2 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            SENTIENT AGENTIC OS
          </motion.p>
        </motion.div>

        {/* Boot Sequence */}
        <motion.div
          className="w-80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <div className="font-mono text-xs space-y-1 mb-4">
            {bootPhase >= 1 && (
              <motion.div
                className="text-neon-cyan/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="text-neon-cyan/30">[OK]</span> Neural core initialized
              </motion.div>
            )}
            {bootPhase >= 2 && (
              <motion.div
                className="text-neon-cyan/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="text-neon-cyan/30">[OK]</span> Memory matrix online
              </motion.div>
            )}
            {bootPhase >= 3 && (
              <motion.div
                className="text-neon-cyan/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="text-neon-cyan/30">[OK]</span> Agent framework loaded
              </motion.div>
            )}
            {bootPhase >= 4 && (
              <motion.div
                className="text-holographic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="text-holographic">[OK]</span> System ready
              </motion.div>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-0.5 bg-neon-cyan/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-neon-cyan/50 to-neon-cyan rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: bootPhase >= 4 ? '100%' : `${(bootPhase / 4) * 100}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
