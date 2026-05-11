'use client';

import { useEffect, useRef } from 'react';

interface Props {
  isActive: boolean;
  analyserNode?: AnalyserNode | null;
  color?: string;
}

export default function WaveformVisualizer({ isActive, analyserNode, color = '#00F0FF' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrame = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isActive && analyserNode) {
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
          gradient.addColorStop(0, color + '40');
          gradient.addColorStop(1, color + 'CC');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      } else if (isActive) {
        // Simulated animation when no real analyser
        const time = Date.now() * 0.002;
        const barCount = 60;
        const barWidth = canvas.width / barCount;

        for (let i = 0; i < barCount; i++) {
          const freq = i * 0.05;
          const amp = Math.sin(time + freq * 3) * 0.3 + Math.sin(time * 2 + freq * 5) * 0.2 + 0.4;
          const barHeight = Math.abs(amp) * canvas.height * 0.7;

          const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
          gradient.addColorStop(0, color + '30');
          gradient.addColorStop(1, color + '99');

          ctx.fillStyle = gradient;
          ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
        }
      } else {
        // Idle state - subtle flat line
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        const time = Date.now() * 0.0003;
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.sin(x * 0.02 + time) * 2;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color + '15';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animFrame.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame.current);
    };
  }, [isActive, analyserNode, color]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      width={400}
      height={40}
    />
  );
}
