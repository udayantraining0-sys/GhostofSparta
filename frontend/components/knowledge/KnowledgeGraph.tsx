'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';

interface KnowledgeNode {
  id: string;
  label: string;
  group: string;
  value: number;
}

interface KnowledgeLink {
  source: string;
  target: string;
  value: number;
}

interface Props {
  nodes?: KnowledgeNode[];
  links?: KnowledgeLink[];
}

const DEMO_NODES: KnowledgeNode[] = [
  { id: 'kratos', label: 'KRATOS', group: 'core', value: 10 },
  { id: 'agents', label: 'Agents', group: 'core', value: 8 },
  { id: 'memory', label: 'Memory', group: 'core', value: 7 },
  { id: 'tools', label: 'Tools', group: 'core', value: 6 },
  { id: 'openai', label: 'OpenAI', group: 'model', value: 5 },
  { id: 'anthropic', label: 'Anthropic', group: 'model', value: 5 },
  { id: 'python', label: 'Python', group: 'tech', value: 3 },
  { id: 'typescript', label: 'TypeScript', group: 'tech', value: 3 },
  { id: 'docker', label: 'Docker', group: 'tech', value: 2 },
  { id: 'weaviate', label: 'Weaviate', group: 'db', value: 4 },
  { id: 'redis', label: 'Redis', group: 'db', value: 3 },
  { id: 'postgres', label: 'PostgreSQL', group: 'db', value: 3 },
];

const DEMO_LINKS: KnowledgeLink[] = [
  { source: 'kratos', target: 'agents', value: 5 },
  { source: 'kratos', target: 'memory', value: 4 },
  { source: 'kratos', target: 'tools', value: 4 },
  { source: 'agents', target: 'openai', value: 3 },
  { source: 'agents', target: 'anthropic', value: 3 },
  { source: 'tools', target: 'python', value: 2 },
  { source: 'tools', target: 'typescript', value: 2 },
  { source: 'tools', target: 'docker', value: 1 },
  { source: 'memory', target: 'weaviate', value: 3 },
  { source: 'memory', target: 'redis', value: 2 },
  { source: 'memory', target: 'postgres', value: 2 },
];

const COLORS: Record<string, string> = {
  core: '#00F0FF',
  model: '#1E90FF',
  tech: '#FF6B35',
  db: '#00FFD1',
};

export default function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 600;
    const height = svgRef.current.clientHeight || 400;

    const g = svg.append('g');

    const simulation = d3.forceSimulation(DEMO_NODES as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(DEMO_LINKS).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(30));

    const link = g.append('g')
      .selectAll('line')
      .data(DEMO_LINKS)
      .join('line')
      .attr('stroke', 'rgba(0, 240, 255, 0.12)')
      .attr('stroke-width', (d: any) => Math.sqrt(d.value) * 0.8)
      .attr('stroke-dasharray', '3 3');

    const node = g.append('g')
      .selectAll('g')
      .data(DEMO_NODES)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (_event: any, d: any) => setSelectedNode(d))
      .call(
        d3.drag<any, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      );

    node.append('circle')
      .attr('r', (d: any) => Math.sqrt(d.value) * 5 + 5)
      .attr('fill', (d: any) => COLORS[d.group] || '#00F0FF')
      .attr('opacity', 0.4)
      .attr('style', (d: any) => `filter: drop-shadow(0 0 8px ${COLORS[d.group] || '#00F0FF'})`);

    node.append('text')
      .text((d: any) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', (d: any) => COLORS[d.group] || '#00F0FF')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, []);

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-1 relative">
        <svg ref={svgRef} className="w-full h-full" />
        {selectedNode && (
          <motion.div
            className="absolute bottom-4 left-4 glass-panel p-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs text-white/60">{selectedNode.label}</p>
            <p className="text-[10px] text-neon-cyan/40 font-mono">{selectedNode.group}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
