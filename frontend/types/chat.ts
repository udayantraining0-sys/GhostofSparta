export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: {
    toolCalls?: ToolCall[];
    memoryRefs?: string[];
    reasoning?: string;
  };
  timestamp: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'running' | 'success' | 'error';
  duration?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  messageCount: number;
  updatedAt: string;
}

export interface StreamingState {
  isStreaming: boolean;
  currentMessage: string;
  currentToolCalls: ToolCall[];
}
