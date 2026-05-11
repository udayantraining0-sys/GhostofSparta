'use client';

import { useEffect, useRef, useCallback } from 'react';

interface StarfieldProps {
  starCount?: number;
  speed?: number;
}

interface Star {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
}

export default function Starfield({ starCount = 400, speed = 0.5 }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animFrameRef = useRef<number>(0);

  const initStars = useCallback((width: number, height: number) => {
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width,
        px: 0,
        py: 0,
      });
    }
    starsRef.current = stars;
  }, [starCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      for (const star of starsRef.current) {
        star.z -= speed;

        if (star.z <= 0) {
          star.z = canvas.width;
          star.x = Math.random() * canvas.width - cx;
          star.y = Math.random() * canvas.height - cy;
        }

        const sx = (star.x / star.z) * canvas.width + cx;
        const sy = (star.y / star.z) * canvas.height + cy;

        if (
          sx < -50 || sx > canvas.width + 50 ||
          sy < -50 || sy > canvas.height + 50 ||
          star.px === 0
        ) {
          star.px = sx;
          star.py = sy;
          continue;
        }

        const depth = 1 - star.z / canvas.width;
        const brightness = depth * 0.8 + 0.2;
        const hue = 190 + depth * 10;

        ctx.beginPath();
        ctx.moveTo(star.px, star.py);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${brightness * 0.3})`;
        ctx.lineWidth = depth * 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sx, sy, depth * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 90%, ${brightness})`;
        ctx.fill();

        star.px = sx;
        star.py = sy;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [speed, initStars]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{ pointerEvents: 'none' }}
    />
  );
}
