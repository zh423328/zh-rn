import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import '../global.css';

import { AppErrorBoundary, AppToast } from '@/components';
import { refreshToken } from '@/features/auth/api';
import { useSessionBootstrap } from '@/features/auth/hooks';
import { useUserStore } from '@/features/auth/store';
import { queryClient } from '@/lib/query-client';
import { useAppStore } from '@/stores/app-store';
import {
  getAccessToken,
  registerRefreshHandler,
  registerSessionExpiredHandler,
} from '@/lib/token-store';
import { UpdateDialog } from '@/features/updates/UpdateDialog';
import { useUpdate } from '@/features/updates/hooks';
import { setupGlobalErrorHandlers } from '@/utils/global-error-handler';
import { logEnvironmentOnce } from '@/utils/platform';

// 全局异常捕获必须在应用入口最早时机安装，
// 放在所有 import 之后、组件定义之前。
setupGlobalErrorHandlers();

/**
 * 根布局
 *
 * 职责顺序（很重要，别随意调整）：
 * 1. GestureHandlerRootView：手势库要求包在最外层
 * 2. QueryClientProvider：所有页面都能用 Query
 * 3. 会话恢复（SecureStore → 内存）完成后才渲染路由，避免闪屏/误跳登录
 * 4. 注册 token 刷新与 401 登出回调
 *
 * 全局样式：global.css 位于项目根目录，由 metro.config.js 的
 * withNativewind({ input: './global.css' }) 接管。app/ 在根目录下，
 * 所以这里用 ../global.css；如果你把 app/ 移回 src/app，请同步改路径。
 */

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppErrorBoundary>
            <StatusBar style="dark" />
            <SessionGate />
            <UpdateDialog />
            <AppToast />
          </AppErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * 会话门禁：恢复 token → 注册刷新/失效回调 → 按登录态控制路由
 */
function SessionGate() {
  const { isReady } = useSessionBootstrap();
  const router = useRouter();
  const segments = useSegments();
  const userInfo = useUserStore((s) => s.userInfo);

  // 注册 token 刷新处理器（single-flight 由 token-store 保证）
  useEffect(() => {
    registerRefreshHandler(async (refresh) => {
      const res = await refreshToken(refresh);
      return { accessToken: res.access_token, refreshToken: res.refresh_token };
    });
    return () => registerRefreshHandler(null);
  }, []);

  // 401 / 刷新失败 → 统一跳登录页（只注册一次）
  useEffect(() => {
    registerSessionExpiredHandler(() => {
      useUserStore.getState().clearUserInfo();
      router.replace('/(auth)/login');
    });
    return () => registerSessionExpiredHandler(null);
  }, [router]);

  // 启动日志（仅一次）
  useEffect(() => {
    logEnvironmentOnce();
  }, []);

  // 会话恢复完成 → 标记全局启动状态（供其他模块判断是否可安全访问 token）
  useEffect(() => {
    if (isReady) useAppStore.getState().setBootstrapped(true);
  }, [isReady]);

  // 启动后自动检查一次更新（静默，不阻塞首屏）
  const update = useUpdate();
  useEffect(() => {
    if (!isReady) return;
    // 延迟一点，避开启动高峰，避免和 session 恢复抢资源
    const timer = setTimeout(() => {
      void update.check();
    }, 1500);
    return () => clearTimeout(timer);
    // 只在会话就绪后执行一次，不依赖 update 对象（每次渲染都是新引用）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  // 登录态与路由分组同步
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isLoggedIn = Boolean(getAccessToken() ?? userInfo);

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isLoggedIn && inAuthGroup) {
      // 注意：(main) 只是分组，没有自己的 index 路由，
      // 跳转必须指向分组内的具体页面，否则会被 typedRoutes 拒绝。
      router.replace('/(main)/home');
    }
  }, [isReady, segments, userInfo, router]);

  if (!isReady) {
    // Splash 阶段返回 null，由 expo-splash-screen / 原生启动屏接管，避免首屏闪烁
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(main)" />
      <Stack.Screen name="modal/confirm" options={{ presentation: 'transparentModal' }} />
    </Stack>
  );
}
