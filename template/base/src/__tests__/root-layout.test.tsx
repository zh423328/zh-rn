/**
 * 根布局回归测试
 *
 * 守住一个曾经导致「启动白屏」的真实缺陷：
 * SessionGate 在会话未就绪时 `return null`，导致根布局不渲染 Stack，
 * Expo Router 拿不到路由树 → 整屏空白，且没有任何报错。
 *
 * 这个测试断言：即使会话未就绪，根布局也必须渲染出内容（而非 null）。
 */
import { render, screen } from '@testing-library/react-native';

// global.css 由 package.json 的 moduleNameMapper 统一映射为空模块

// 单独 mock expo-router：测试关注根布局是否渲染 Stack，不需要真实导航容器
jest.mock('expo-router', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const React = require('react');
  const { View } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */

  function Stack({ children }: { children?: React.ReactNode }) {
    return React.createElement(View, { testID: 'router-stack' }, children);
  }
  Stack.Screen = function Screen() {
    return null;
  };
  // Protected 是 expo-router 的声明式认证组件，mock 时直接透传 children
  Stack.Protected = function Protected({ children }: { children?: React.ReactNode }) {
    return React.createElement(View, null, children);
  };

  return {
    Stack,
    Redirect: () => null,
    router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
    useRouter: () => ({ replace: jest.fn() }),
    useSegments: () => [],
  };
});

// 让会话初始化始终不完成，模拟「未就绪」这一最容易白屏的时刻
jest.mock('@/features/auth/hooks', () => ({
  ...jest.requireActual('@/features/auth/hooks'),
  useSessionBootstrap: () => ({ isReady: false, error: null }),
}));

describe('根布局', () => {
  it('会话未就绪时仍然渲染 Stack（不能返回 null 导致白屏）', async () => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const RootLayout = require('~app/_layout').default;
    /* eslint-enable @typescript-eslint/no-require-imports */

    const { toJSON } = await render(<RootLayout />);

    // 核心断言：必须有渲染输出
    expect(toJSON()).not.toBeNull();
    // 并且导航器确实被渲染
    expect(screen.getByTestId('router-stack')).toBeTruthy();
  });

  it('未就绪时覆盖启动加载层（而不是白屏）', async () => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const RootLayout = require('~app/_layout').default;
    /* eslint-enable @typescript-eslint/no-require-imports */

    await render(<RootLayout />);

    // BootSplash 里有 ActivityIndicator，说明给了加载反馈而非空白
    const json = JSON.stringify(screen.toJSON());
    expect(json).toContain('ActivityIndicator');
  });
});
