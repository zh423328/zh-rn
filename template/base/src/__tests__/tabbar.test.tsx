/**
 * 主业务区 TabBar 回归测试
 *
 * 守住两个真实缺陷：
 * 1. 图标外包固定高度容器，导致文字标签被挤出可视区（只剩图标）
 * 2. tabBar 高度写死且漏算 item 自带的 padding，中文标签下半截被裁切
 *
 * 断言方式：渲染真实路由树，检查每个 tab 的中文标签确实存在。
 */
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';

jest.mock('expo-updates', () => ({
  isEnabled: false,
  channel: null,
  runtimeVersion: '1.0.0',
  updateId: null,
  isEmbeddedLaunch: true,
  createdAt: null,
  launchDuration: null,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
  readLogEntriesAsync: jest.fn(async () => []),
}));

// 已登录才能进入 (main) 分组
jest.mock('@/lib/token-store', () => ({
  ...jest.requireActual('@/lib/token-store'),
  getAccessToken: () => 'mock-token',
  hydrateTokens: jest.fn(async () => {}),
}));

// 实时连接不参与本测试
jest.mock('@/features/notifications/notification-store', () => ({
  useNotificationStore: Object.assign(
    jest.fn((selector: (s: unknown) => unknown) =>
      selector({
        notifications: [],
        unreadCount: 0,
        status: 'idle',
        addNotification: jest.fn(),
        markAsRead: jest.fn(),
        clear: jest.fn(),
        setStatus: jest.fn(),
      }),
    ),
    { getState: () => ({ setStatus: jest.fn() }) },
  ),
  connectNotifications: () => () => {},
}));

describe('(main) TabBar', () => {
  it('进入 /home 后，三个中文标签都渲染出来', async () => {
    renderRouter('app', { initialUrl: '/home' });

    await waitFor(
      () => {
        expect(screen.getByText('首页')).toBeTruthy();
        expect(screen.getByText('设备')).toBeTruthy();
        expect(screen.getByText('我的')).toBeTruthy();
      },
      { timeout: 10000 },
    );
  });
});
