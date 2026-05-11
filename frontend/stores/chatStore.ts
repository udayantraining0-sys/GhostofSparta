import { create } from 'zustand';
import type { Message, StreamingState, ChatSession } from '@/types/chat';

interface ChatStore {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Message[];
  streaming: StreamingState;
  isLoading: boolean;

  setSessions: (sessions: ChatSession[]) => void;
  setActiveSession: (id: string) => void;
  addMessage: (message: Message) => void;
  appendToCurrentMessage: (content: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  streaming: {
    isStreaming: false,
    currentMessage: '',
    currentToolCalls: [],
  },
  isLoading: false,

  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (id) => set({ activeSessionId: id }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  appendToCurrentMessage: (content) =>
    set((state) => ({
      streaming: {
        ...state.streaming,
        currentMessage: state.streaming.currentMessage + content,
      },
    })),

  setIsStreaming: (isStreaming) =>
    set({
      streaming: {
        isStreaming,
        currentMessage: '',
        currentToolCalls: [],
      },
    }),

  setIsLoading: (isLoading) => set({ isLoading }),
  clearMessages: () => set({ messages: [] }),
}));
