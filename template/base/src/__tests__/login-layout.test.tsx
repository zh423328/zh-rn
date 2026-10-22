/**
 * 登录页布局回归测试
 *
 * 目的：守住「键盘弹出时内容重叠」这个 Android 真实缺陷。
 * 之前登录页缺少可滚动容器，键盘弹出压缩窗口后各元素溢出互相覆盖，
 * 排版完全错乱。这个测试确保后续改动不会把避让结构删掉。
 */
import { render, screen } from '@testing-library/react-native';

import Login from '../../app/(auth)/login';

// 登录页引入 mutation hooks，这里只关心布局结构，
// 用最小 mock 避免拉起真实网络与 store。
jest.mock('@/features/auth/hooks', () => ({
  toErrorMessage: (_e: unknown, fallback: string) => fallback,
  useLoginByAccount: () => ({ mutate: jest.fn(), isPending: false }),
  useLoginByPhone: () => ({ mutate: jest.fn(), isPending: false }),
  useSendVerificationCode: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn() },
}));

describe('登录页布局', () => {
  it('渲染核心表单元素', async () => {
    await render(<Login />);
    expect(screen.getByText('欢迎登录')).toBeTruthy();
    expect(screen.getByText('登录')).toBeTruthy();
  });

  it('保留可滚动容器（Android 键盘弹出不重叠的关键）', async () => {
    await render(<Login />);
    expect(screen.getByTestId('login-scroll')).toBeTruthy();
  });

  it('保留 KeyboardAvoidingView（iOS 键盘避让）', async () => {
    await render(<Login />);
    expect(screen.getByTestId('login-keyboard-avoiding')).toBeTruthy();
  });
});
