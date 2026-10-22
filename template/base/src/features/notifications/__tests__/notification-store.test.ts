/**
 * 状态转换测试：通知 store
 *
 * 文档 14 节要求「状态转换」测试。这里覆盖通知的去重与未读数计算，
 * 这两个逻辑最容易出错。
 */
import { useNotificationStore, type AppNotification } from '@/features/notifications/notification-store';

function makeItem(id: string, read = false): AppNotification {
  return {
    id,
    title: `通知 ${id}`,
    createdAt: new Date().toISOString(),
    read,
  };
}

describe('useNotificationStore', () => {
  beforeEach(() => {
    // 每个用例前重置，避免用例间互相污染
    useNotificationStore.setState({ notifications: [], unreadCount: 0, status: 'idle' });
  });

  it('新增通知后未读数增加', () => {
    useNotificationStore.getState().addNotification(makeItem('1'));

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
  });

  it('相同 id 的消息只记录一次（重连补发去重）', () => {
    useNotificationStore.getState().addNotification(makeItem('1'));
    useNotificationStore.getState().addNotification(makeItem('1'));

    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });

  it('新消息排在最前', () => {
    useNotificationStore.getState().addNotification(makeItem('1'));
    useNotificationStore.getState().addNotification(makeItem('2'));

    const ids = useNotificationStore.getState().notifications.map((n) => n.id);
    expect(ids).toEqual(['2', '1']);
  });

  it('标记已读后未读数下降', () => {
    useNotificationStore.getState().addNotification(makeItem('1'));
    useNotificationStore.getState().markAsRead('1');

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications[0].read).toBe(true);
  });

  it('已读消息不计入未读数', () => {
    useNotificationStore.getState().addNotification(makeItem('1', true));
    useNotificationStore.getState().addNotification(makeItem('2', false));

    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });

  it('clear 清空所有通知', () => {
    useNotificationStore.getState().addNotification(makeItem('1'));
    useNotificationStore.getState().clear();

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
  });

  it('最多保留 100 条', () => {
    for (let i = 0; i < 105; i += 1) {
      useNotificationStore.getState().addNotification(makeItem(String(i)));
    }
    expect(useNotificationStore.getState().notifications).toHaveLength(100);
  });
});
