/**
 * 登录态判定一致性测试
 *
 * 守住一个导致「已登录用户白屏」的真实缺陷：
 * 之前 index.tsx 用 `Boolean(getAccessToken())` 判断，
 * 而根布局的 Protected 守卫用 `Boolean(getAccessToken() ?? userInfo)`。
 * 当 token 丢失但 userInfo 还在时：
 *   index 认为未登录 → 跳 /login
 *   守卫认为已登录 → 拦住 (auth) 分组
 *   → 两个分组都不可访问 → 整屏空白且零报错。
 *
 * 修复方式是把判断统一到 resolveIsLoggedIn()。
 */
import { resolveIsLoggedIn } from '@/features/auth/session';
import { useUserStore } from '@/features/auth/store';
import { getAccessToken } from '@/lib/token-store';

jest.mock('@/lib/token-store', () => ({
  getAccessToken: jest.fn(),
}));

const mockGetToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;

const fakeUser = {
  id: 1,
  username: 'admin',
  nickname: '管理员',
  avatar: '',
  role: 'admin',
};

describe('resolveIsLoggedIn', () => {
  beforeEach(() => {
    mockGetToken.mockReset();
    useUserStore.setState({ userInfo: null });
  });

  it('有 token 时视为已登录', () => {
    mockGetToken.mockReturnValue('token-abc');
    expect(resolveIsLoggedIn()).toBe(true);
  });

  it('无 token 但有用户信息时仍视为已登录（避免误踢）', () => {
    mockGetToken.mockReturnValue(null);
    useUserStore.setState({ userInfo: fakeUser });
    expect(resolveIsLoggedIn()).toBe(true);
  });

  it('无 token 且无用户信息时视为未登录', () => {
    mockGetToken.mockReturnValue(null);
    expect(resolveIsLoggedIn()).toBe(false);
  });

  it('判断结果不依赖调用顺序（关键：两处调用必须一致）', () => {
    mockGetToken.mockReturnValue(null);
    useUserStore.setState({ userInfo: fakeUser });

    // 模拟 index.tsx 与 _layout.tsx 各调用一次
    const fromIndex = resolveIsLoggedIn();
    const fromLayout = resolveIsLoggedIn();

    expect(fromIndex).toBe(fromLayout);
    expect(fromIndex).toBe(true);
  });
});
