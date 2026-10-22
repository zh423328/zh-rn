import { create } from 'zustand';

import type { IDownloadProgress, IUpdateDecision, UpdatePhase } from './types';

/**
 * 更新状态（全局单例）
 *
 * 为什么放进全局 store：
 * 更新流程可能跨越多个页面（弹窗 → 下载 → 安装），
 * 组件本地 state 在页面切换时会丢失，导致进度条卡住或重复触发。
 */
interface UpdateState {
  phase: UpdatePhase;
  /** 检查结果 */
  decision: IUpdateDecision | null;
  /** 下载进度 */
  progress: IDownloadProgress | null;
  /** 错误信息 */
  error: string | null;
  /** 是否已提示过（避免每次启动都弹） */
  dismissed: boolean;

  setPhase: (phase: UpdatePhase) => void;
  setDecision: (decision: IUpdateDecision | null) => void;
  setProgress: (progress: IDownloadProgress | null) => void;
  setError: (error: string | null) => void;
  setDismissed: (dismissed: boolean) => void;
  /** 重置（安装完成后调用） */
  reset: () => void;
}

export const useUpdateStore = create<UpdateState>()((set) => ({
  phase: 'idle',
  decision: null,
  progress: null,
  error: null,
  dismissed: false,

  setPhase: (phase) => set({ phase }),
  setDecision: (decision) => set({ decision }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  setDismissed: (dismissed) => set({ dismissed }),

  reset: () =>
    set({ phase: 'idle', decision: null, progress: null, error: null, dismissed: false }),
}));
