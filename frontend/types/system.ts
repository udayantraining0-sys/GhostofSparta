export interface Panel {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  zIndex: number;
}

export type PanelType =
  | 'chat'
  | 'terminal'
  | 'agents'
  | 'knowledge'
  | 'browser'
  | 'models'
  | 'workflows'
  | 'missions'
  | 'monitor'
  | 'voice'
  | 'settings';

export interface LayoutState {
  panels: Panel[];
  activePanel: PanelType;
  leftDockOpen: boolean;
  rightDockOpen: boolean;
}
