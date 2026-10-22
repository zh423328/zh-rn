import { create } from 'zustand';

import { getAccessToken } from '@/lib/token-store';

import { getRealtimeClient } from './ws-client';
import type { RealtimeStatus } from './realtime-client';

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  status: RealtimeStatus;
  addNotification: (item: AppNotification) => void;
  markAsRead: (id: string) => void;
  clear: () => void;
  setStatus: (status: RealtimeStatus) => void;
}

/**
 * 通知中心状态
 *
 * 这里用 Zustand 而非 TanStack Query，因为消息来自推送通道（push），
 * 不是「拉取-缓存」模型。历史通知列表仍可用 Query 拉取。
 */
export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  status: 'idle',

  addNotification: (item) =>
    set((state) => {
      // 按 id 去重：重连补发可能造成重复消息
      if (state.notifications.some((n) => n.id === item.id)) return state;
      const notifications = [item, ...state.notifications].slice(0, 100);
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    }),

  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    }),

  clear: () => set({ notifications: [], unreadCount: 0 }),

  setStatus: (status) => set({ status }),
}));

/**
 * 连接实时通道并订阅通知主题。
 *
 * 在业务根布局中调用一次；返回清理函数，组件卸载时断开连接。
 */
export function connectNotifications(): () => void {
  // getToken 每次重连时重新读取，保证刷新 token 后连接用新凭证
  const client = getRealtimeClient({ getToken: () => getAccessToken() });
  const unsubscribeStatus = client.onStatusChange((status) => {
    useNotificationStore.getState().setStatus(status);
  });

  const handler = (payload: unknown) => {
    const data = payload as Partial<AppNotification> | null;
    if (!data?.id || !data.title) return;
    useNotificationStore.getState().addNotification({
      id: String(data.id),
      title: data.title,
      body: data.body,
      createdAt: data.createdAt ?? new Date().toISOString(),
      read: Boolean(data.read),
    });
  };

  client.connect().catch(() => {});
  client.subscribe('notifications', handler).catch(() => {});

  return () => {
    unsubscribeStatus();
    client.unsubscribe('notifications').catch(() => {});
  };
}
