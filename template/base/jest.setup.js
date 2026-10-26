/* eslint-env jest */

/**
 * Jest 初始化文件
 *
 * 测试环境没有原生层，需要为所有涉及原生能力的模块提供 mock，
 * 否则组件一旦被渲染就会抛 "NativeModule is null" 之类的错误。
 */

// AsyncStorage 官方提供的 mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated：必须替换掉。
// 测试环境没有 worklets / reanimated 的原生层，真实实现一 import 就会
// 去访问不存在的原生模块；而 expo-router 的原生 Stack 会间接拉起这条
// 依赖链，让 renderRouter 直接抛错。
//
// 替身实现见 test-mocks/reanimated.js（动画瞬时完成）。
// 该目录不能叫 __mocks__：jest 会把 __mocks__ 下与包同名的文件
// 当作自动 mock，从而出现「mock 文件自己 require 自己」的无限递归。
//
// 另外 package.json 里把 `react-native-reanimated/mock` 也映射到了
// 同一个替身 —— expo-router/testing-library 内部会用它做替换，
// 而官方那个 mock 是 TS 源码，转译后缺少 useSharedValue 等具名导出。
jest.mock('react-native-reanimated', () => require('./test-mocks/reanimated'));

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

// expo-application 固定版本号，便于断言
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
  applicationName: 'zh-rn-app',
  applicationId: 'com.company.example',
}));

// expo-splash-screen：组件树里会调用 hideAsync，需提供空实现
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => {}),
  hideAsync: jest.fn(async () => {}),
  hide: jest.fn(),
  setOptions: jest.fn(),
}));

// expo-file-system（新 API）用于 APK 下载，测试中不触达真实文件系统
jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    exists = false;
    size = 0;
    constructor(...parts: unknown[]) {
      this.uri = `file:///mock/${parts.join('/')}`;
    }
    delete() {}
    static createDownloadTask() {
      return { downloadAsync: jest.fn(async () => null) };
    }
    static downloadFileAsync() {
      return Promise.resolve(null);
    }
  }
  class MockDirectory {
    exists = true;
    constructor(...parts: unknown[]) {
      this.uri = `file:///mock/${parts.join('/')}`;
    }
    create() {}
    delete() {}
  }
  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { cache: new MockDirectory('cache'), document: new MockDirectory('document') },
  };
});

// expo-intent-launcher：安装 APK 用，测试中只断言调用
jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn(async () => ({ resultCode: 0 })),
  ActivityAction: {},
}));

// gesture-handler 需要原生模块，测试中用官方 jestSetup
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children),
    Gesture: { Pan: () => ({ onUpdate: () => ({}) }) },
    GestureDetector: ({ children }: { children?: React.ReactNode }) => children,
    State: {},
    Directions: {},
  };
});

// safe-area-context：提供固定 insets，避免依赖原生测量
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children),
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(View, props, children),
    SafeAreaInsetsContext: React.createContext(insets),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

// 屏蔽测试期间的日志噪音（需要排查时可临时注释掉）
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'info').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
