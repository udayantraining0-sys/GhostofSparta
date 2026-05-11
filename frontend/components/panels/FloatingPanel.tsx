'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2, Maximize2, GripHorizontal } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  title: string;
  initialPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  isOpen?: boolean;
  onClose?: () => void;
  zIndex?: number;
}

export default function FloatingPanel({
  children,
  title,
  initialPosition = { x: 100, y: 100 },
  defaultSize = { width: 480, height: 400 },
  minWidth = 300,
  minHeight = 200,
  isOpen = true,
  onClose,
  zIndex = 50,
}: Props) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, posX: position.x, posY: position.y };
    e.preventDefault();
  }, [position]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: size.width, startH: size.height };
    e.preventDefault();
    e.stopPropagation();
  }, [size]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;
    const handleMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: Math.max(0, dragRef.current.posX + e.clientX - dragRef.current.startX),
          y: Math.max(0, dragRef.current.posY + e.clientY - dragRef.current.startY),
        });
      }
      if (isResizing) {
        setSize({
          width: Math.max(minWidth, resizeRef.current.startW + e.clientX - resizeRef.current.startX),
          height: Math.max(minHeight, resizeRef.current.startH + e.clientY - resizeRef.current.startY),
        });
      }
    };
    const handleUp = () => { setIsDragging(false); setIsResizing(false); };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isDragging, isResizing, minWidth, minHeight]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed glass-panel overflow-hidden"
          style={{
            left: position.x,
            top: position.y,
            width: isMinimized ? 260 : size.width,
            height: isMinimized ? 'auto' : size.height,
            zIndex,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2 border-b border-glass cursor-move select-none"
            onMouseDown={handleDragStart}
          >
            <div className="flex items-center gap-2">
              <GripHorizontal size={12} className="text-white/15" />
              <span className="text-xs font-mono text-neon-cyan/60 uppercase tracking-wider">{title}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded hover:bg-neon-cyan/10 text-white/30 hover:text-neon-cyan"
              >
                {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-red-500/10 text-white/30 hover:text-red-400"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="overflow-auto" style={{ height: size.height - 37 }}>
              {children}
            </div>
          )}

          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={handleResizeStart}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className="absolute bottom-1 right-1">
              <path d="M0 12L12 0M5 12L12 5M10 12L12 10" stroke="rgba(0,240,255,0.15)" strokeWidth="1" />
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
