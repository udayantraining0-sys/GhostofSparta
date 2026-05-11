'use client';

import { useEffect, useRef } from 'react';

interface Props {
  className?: string;
  lineColor?: string;
  dotColor?: string;
}

export default function NeuralGrid({ className = '', lineColor = 'rgba(0,240,255,0.03)', dotColor = 'rgba(0,240,255,0.08)' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

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

    const spacing = 50;
    const time = { value: 0 };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time.value += 0.005;

      // Draw hex grid lines
      for (let y = 0; y < canvas.height + spacing; y += spacing) {
        for (let x = 0; x < canvas.width + spacing; x += spacing * 2) {
          const offsetX = (Math.floor(y / spacing) % 2) * spacing;
          const cx = x + offsetX;
          const cy = y;

          if (cx > canvas.width + spacing || cy > canvas.height + spacing) continue;

          // Hex vertices
          const vertices: [number, number][] = [];
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const pulse = 1 + Math.sin(time.value * 2 + i + cx * 0.001) * 0.15;
            vertices.push([
              cx + Math.cos(angle) * spacing * 0.55 * pulse,
              cy + Math.sin(angle) * spacing * 0.55 * pulse,
            ]);
          }

          ctx.beginPath();
          ctx.moveTo(vertices[0][0], vertices[0][1]);
          for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i][0], vertices[i][1]);
          }
          ctx.closePath();
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 0.5;
          ctx.stroke();

          // Center dot
          const dotPulse = 1 + Math.sin(time.value * 3 + cx * 0.0005 + cy * 0.0005) * 0.3;
          ctx.beginPath();
          ctx.arc(cx, cy, 1.2 * dotPulse, 0, Math.PI * 2);
          ctx.fillStyle = dotColor;
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [lineColor, dotColor]);

  return (
    <canvas ref={canvasRef} className={`pointer-events-none ${className}`} />
  );
}
