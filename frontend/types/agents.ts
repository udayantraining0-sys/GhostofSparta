export type AgentType =
  | 'researcher'
  | 'coder'
  | 'planner'
  | 'executor'
  | 'browser_agent'
  | 'memory_agent';

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'paused'
  | 'stopped'
  | 'error';

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  status: AgentStatus;
  currentTask: string | null;
  model: string;
  toolCount: number;
  memoryUsage: number;
  startedAt: string | null;
}

export interface AgentThought {
  id: string;
  agentId: string;
  step: number;
  type: 'planning' | 'action' | 'observation' | 'reflection' | 'final';
  content: string;
  toolName: string | null;
  toolStatus: 'running' | 'success' | 'error' | null;
  timestamp: string;
}
