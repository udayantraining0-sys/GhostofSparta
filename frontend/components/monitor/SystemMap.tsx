'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Brain, Wrench, Zap, Clock } from 'lucide-react';

interface Metric {
  label: string;
  value: number;
  history: number[];
  color: string;
  icon: React.ReactNode;
  unit: string;
}

export default function SystemMap() {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: 'API Requests', value: 0, history: Array(40).fill(0), color: '#00F0FF', icon: <Activity size={12} />, unit: '/s' },
    { label: 'Active Agents', value: 2, history: Array(40).fill(0), color: '#1E90FF', icon: <Cpu size={12} />, unit: '' },
    { label: 'Memory Ops', value: 0, history: Array(40).fill(0), color: '#00FFD1', icon: <Brain size={12} />, unit: '/s' },
    { label: 'Tool Calls', value: 0, history: Array(40).fill(0), color: '#FF6B35', icon: <Wrench size={12} />, unit: '' },
    { label: 'Avg Latency', value: 0, history: Array(40).fill(0), color: '#8B5CF6', icon: <Clock size={12} />, unit: 'ms' },
    { label: 'Tokens/sec', value: 0, history: Array(40).fill(0), color: '#F59E0B', icon: <Zap size={12} />, unit: '' },
  ]);

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((m) => ({
          ...m,
          value: m.label === 'Active Agents' ? 2 : Math.floor(Math.random() * (m.label === 'Avg Latency' ? 200 : 20)),
          history: [...m.history.slice(1), Math.floor(Math.random() * (m.label === 'Avg Latency' ? 200 : 20))],
        }))
      );
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {metrics.map((metric) => (
          <motion.div
            key={metric.label}
            className="glass-panel p-3"
            whileHover={{ borderColor: 'rgba(0,240,255,0.2)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span style={{ color: metric.color }}>{metric.icon}</span>
                <span className="text-[10px] text-white/30 font-mono uppercase">{metric.label}</span>
              </div>
            </div>
            <p className="text-xl font-mono" style={{ color: metric.color }}>
              {metric.value}
              <span className="text-[10px] text-white/15 ml-1">{metric.unit}</span>
            </p>

            {/* Sparkline */}
            <div className="mt-2 h-8">
              <svg width="100%" height="100%" viewBox="0 0 40 20" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`grad-${metric.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={metric.color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={metric.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 0,20 L ${metric.history
                    .map(
                      (v, i) => {
                        const maxVal = Math.max(...metric.history, 1);
                        const x = (i / (metric.history.length - 1)) * 40;
                        const y = 20 - (v / maxVal) * 18;
                        return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
                      }
                    )
                    .join(' ')} L 40,20 Z`}
                  fill={`url(#grad-${metric.label})`}
                />
                <path
                  d={metric.history
                    .map(
                      (v, i) => {
                        const maxVal = Math.max(...metric.history, 1);
                        const x = (i / (metric.history.length - 1)) * 40;
                        const y = 20 - (v / maxVal) * 18;
                        return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
                      }
                    )
                    .join(' ')}
                  fill="none"
                  stroke={metric.color}
                  strokeWidth="0.8"
                />
              </svg>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sankey-like flow diagram */}
      <div className="px-4 pb-4">
        <p className="text-[10px] font-mono text-white/20 uppercase tracking-wider mb-2 px-1">Request Flow</p>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2">
            {[
              { label: 'Client', color: '#00F0FF', width: 60 },
              { label: 'BFF', color: '#1E90FF', width: 30 },
              { label: 'Core', color: '#8B5CF6', width: 45 },
              { label: 'LLM', color: '#FF6B35', width: 25 },
              { label: 'Memory', color: '#00FFD1', width: 35 },
            ].map((node, i) => (
              <div key={node.label} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div
                    className="rounded-md px-2 py-1 text-[9px] font-mono"
                    style={{ backgroundColor: node.color + '15', color: node.color, border: `1px solid ${node.color}30` }}
                  >
                    {node.label}
                  </div>
                  {/* Flow bar */}
                  <motion.div
                    className="h-0.5 mt-0.5 rounded-full"
                    style={{ width: node.width, backgroundColor: node.color + '40' }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.2, duration: 0.5 }}
                  />
                </div>
                {i < 4 && (
                  <svg width="20" height="12" viewBox="0 0 20 12">
                    <path
                      d="M0,6 L14,6"
                      stroke="rgba(0,240,255,0.1)"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <path
                      d="M12,3 L16,6 L12,9"
                      stroke="rgba(0,240,255,0.2)"
                      strokeWidth="1"
                      fill="none"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
