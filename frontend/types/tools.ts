export type ToolName =
  | 'terminal'
  | 'browser'
  | 'filesystem'
  | 'code_executor'
  | 'search'
  | 'memory_search'
  | 'memory_store'
  | 'git'
  | 'api_call'
  | 'image_analysis'
  | 'calculator';

export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: Record<string, unknown>;
  requiresSandbox: boolean;
}

export interface ToolExecution {
  id: string;
  agentId: string;
  toolName: ToolName;
  input: Record<string, unknown>;
  output?: string;
  status: 'running' | 'success' | 'error' | 'timeout';
  duration: number;
  error?: string;
  timestamp: string;
}
