import { create } from 'zustand';

/**
 * 轻量全局 UI 状态
 *
 * 边界：只放「客户端自身」的状态（启动就绪、网络在线等）。
 * 服务端数据一律交给 TanStack Query，不要在这里复制一份。
 */

interface AppState {
  /** 会话/资源是否初始化完成（用于控制 Splash 与首屏渲染） */
  isBootstrapped: boolean;
  setBootstrapped: (value: boolean) => void;
  /** 当前登录页是否正在被强制跳转，避免重复导航 */
  isRedirecting: boolean;
  setRedirecting: (value: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  isBootstrapped: false,
  setBootstrapped: (value) => set({ isBootstrapped: value }),
  isRedirecting: false,
  setRedirecting: (value) => set({ isRedirecting: value }),
}));
