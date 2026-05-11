'use client';

import { useEffect, useRef, useMemo } from 'react';

interface Props {
  className?: string;
  speed?: number;
  density?: number;
}

export default function DataStream({ className = '', speed = 1, density = 0.03 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const chars = useMemo(() => 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>[]{}'.split(''), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const fontSize = 12;
    const columns = Math.floor(canvas.width / fontSize * density);
    const drops: number[] = Array.from({ length: Math.max(columns, 1) }, () => Math.random() * canvas.height);

    const draw = () => {
      ctx.fillStyle = `rgba(5, 5, 12, 0.05)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * (fontSize / density);

        if (drops[i] * fontSize > 0 && drops[i] * fontSize < canvas.height) {
          // Bright head
          ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
          ctx.fillText(char, x, drops[i] * fontSize);

          // Trailing dim
          for (let j = 1; j < 4; j++) {
            const trailY = drops[i] * fontSize - j * fontSize;
            if (trailY < 0) break;
            ctx.fillStyle = `rgba(0, 240, 255, ${0.15 / j})`;
            ctx.fillText(
              chars[Math.floor(Math.random() * chars.length)],
              x + Math.sin(i) * j * 2,
              trailY,
            );
          }
        }

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += speed * (0.5 + Math.random() * 0.5);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [speed, density, chars]);

  return (
    <canvas ref={canvasRef} className={`pointer-events-none ${className}`} />
  );
}
