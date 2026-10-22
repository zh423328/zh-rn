/**
 * 路由跳转回归测试
 *
 * 守住一个曾经导致「一直转圈、无法进入登录页」的真实缺陷：
 * 根布局的 SessionGate 里曾错误调用 useRootNavigationState()，
 * 而该 hook 必须在导航容器内部的 route 中调用 —— 放在 Stack 外层时
 * 拿不到 parent，navigationReady 永远为 false，导致 replace 永不执行，
 * 页面永久停在 "/" 的 Loading 上（表现为白屏 + 转圈）。
 */
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';

// expo-updates 在测试环境禁用
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

describe('路由跳转', () => {
  it('访问 / 应自动跳转到登录页（不能卡在 Loading）', async () => {
    const router = renderRouter('app', { initialUrl: '/' });

    await waitFor(
      () => {
        expect(screen.getByText('欢迎登录')).toBeTruthy();
      },
      { timeout: 10000 },
    );

    // 关键：路径必须真的变了，而不是停在 "/"
    expect(router.getPathname()).toBe('/login');
  });
});
