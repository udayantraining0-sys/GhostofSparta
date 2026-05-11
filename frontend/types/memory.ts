export interface MemoryItem {
  id: string;
  content: string;
  type: 'episodic' | 'semantic' | 'conversation' | 'procedural';
  importance: number;
  tags: string[];
  agentId?: string;
  missionId?: string;
  createdAt: string;
  lastAccessed: string;
  score?: number;
}

export interface MemorySearchResult {
  items: MemoryItem[];
  query: string;
  totalResults: number;
}
