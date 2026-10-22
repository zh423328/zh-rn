/* eslint-env jest */

/**
 * Jest 初始化文件
 *
 * - 关闭 NativeWind / react-native-css 在测试环境中的样式编译，
 *   避免在 jsdom 之外触发 lightningcss 原生模块。
 * - 提供常用原生模块的 mock。
 */

// expo-secure-store 在测试环境无原生实现
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    isAvailableAsync: jest.fn(async () => true),
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
    __reset: () => store.clear(),
  };
});

// expo-crypto.randomUUID 在 Node 下用 crypto 替代
jest.mock('expo-crypto', () => ({
  randomUUID: () => require('node:crypto').randomUUID(),
}));

// expo-updates 在测试环境默认禁用
jest.mock('expo-updates', () => ({
  isEnabled: false,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

// expo-application 固定版本号，便于断言
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
  applicationName: 'zh-rn-app',
  applicationId: 'com.company.example',
}));

// 屏蔽测试期间的日志噪音（需要排查时可临时注释掉）
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'info').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
