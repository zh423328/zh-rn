/**
 * 更新检查在开发环境的行为
 *
 * 之前的问题：dev 环境仍会请求 /app/version，接口不存在时报错刷屏，
 * 且 OTA 在 dev 下本就不可用，这次检查毫无意义。
 */
import { checkForUpdates } from '@/features/updates/api';

const mockGet = jest.fn();
jest.mock('@/api/client', () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
}));

jest.mock('expo-updates', () => ({
  isEnabled: false,
  runtimeVersion: '1.0.0',
  updateId: null,
}));

describe('checkForUpdates 在开发环境', () => {
  beforeEach(() => {
    mockGet.mockClear();
  });

  it('不请求版本接口，直接返回无更新', async () => {
    const result = await checkForUpdates();

    // 关键断言：dev 下不应发起任何网络请求
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.hasUpdate).toBe(false);
    expect(result.kind).toBe('none');
  });

  it('返回本地版本号，便于 UI 展示当前版本', async () => {
    const result = await checkForUpdates();
    expect(result.currentVersion).toBe('1.0.0');
  });
});
