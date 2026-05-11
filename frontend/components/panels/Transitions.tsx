'use client';

import { motion } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  className?: string;
}

const pageVariants = {
  initial: { opacity: 0, filter: 'blur(4px)', scale: 0.97 },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: {
    opacity: 0,
    filter: 'blur(4px)',
    scale: 0.97,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const panelSlide = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

export function PageTransition({ children, className = '' }: Props) {
  return (
    <motion.div
      className={className}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

export function PanelTransition({ children, className = '' }: Props) {
  return (
    <motion.div
      className={className}
      variants={panelSlide}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
