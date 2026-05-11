import { create } from 'zustand';
import type { PanelType } from '@/types/system';
import { persist } from 'zustand/middleware';

interface LayoutStore {
  activePanel: PanelType;
  leftDockOpen: boolean;
  rightDockOpen: boolean;
  bottomBarVisible: boolean;
  setActivePanel: (panel: PanelType) => void;
  toggleLeftDock: () => void;
  toggleRightDock: () => void;
  setBottomBarVisible: (visible: boolean) => void;
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      activePanel: 'chat',
      leftDockOpen: true,
      rightDockOpen: false,
      bottomBarVisible: true,
      setActivePanel: (panel) => set({ activePanel: panel }),
      toggleLeftDock: () => set((s) => ({ leftDockOpen: !s.leftDockOpen })),
      toggleRightDock: () => set((s) => ({ rightDockOpen: !s.rightDockOpen })),
      setBottomBarVisible: (visible) => set({ bottomBarVisible: visible }),
    }),
    { name: 'kratos-layout' }
  )
);
