import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import '../global.css';

import { AppErrorBoundary, AppToast } from '@/components';
import { refreshToken } from '@/features/auth/api';
import { useSessionBootstrap } from '@/features/auth/hooks';
import { useUserStore } from '@/features/auth/store';
import { resolveIsLoggedIn } from '@/features/auth/session';
import { queryClient } from '@/lib/query-client';
import { useAppStore } from '@/stores/app-store';
import { registerRefreshHandler, registerSessionExpiredHandler } from '@/lib/token-store';
import { UpdateDialog } from '@/features/updates/UpdateDialog';
import { useUpdate } from '@/features/updates/hooks';
import { setupGlobalErrorHandlers } from '@/utils/global-error-handler';
import { logEnvironmentOnce } from '@/utils/platform';

// 全局异常捕获必须在应用入口最早时机安装，
// 放在所有 import 之后、组件定义之前。
setupGlobalErrorHandlers();

// 阻止启动屏自动隐藏：等会话恢复完成后再由 SessionGate 主动隐藏。
// 不做这一步的话，splash 会先消失，而根布局此时还没渲染出内容 → 白屏。
// 注意：必须在模块顶层调用，放进组件里会因时序太晚而失效。
void SplashScreen.preventAutoHideAsync();

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
  // 订阅 userInfo 变化：登录/登出后需重新计算登录态，触发 Protected 重新求值
  useUserStore((s) => s.userInfo);
  const isLoggedIn = resolveIsLoggedIn();

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

  // 会话就绪后隐藏启动屏
  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  /*
   * 认证路由用 Stack.Protected 声明式控制（expo-router 官方推荐方案）。
   *
   * 为什么不用 useEffect + router.replace：
   * 那种写法依赖「导航容器已就绪」这个隐含前提，时序稍有偏差跳转就被丢弃，
   * 表现为一直停在入口页（白屏或转圈），且没有任何报错。
   * Protected 由路由层直接判断可访问性，不依赖任何时序。
   *
   * 注意：这里绝不能 `return null` —— Expo Router 要求根布局始终渲染导航器，
   * 否则导航容器拿不到路由树，整屏空白。
   */
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />

        {/* 未登录才可访问 */}
        <Stack.Protected guard={!isLoggedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        {/* 已登录才可访问 */}
        <Stack.Protected guard={isLoggedIn}>
          <Stack.Screen name="(main)" />
        </Stack.Protected>

        <Stack.Screen name="modal/confirm" options={{ presentation: 'transparentModal' }} />
      </Stack>
      {!isReady ? <BootSplash /> : null}
    </>
  );
}

/** 启动等待覆盖层：与启动屏同色，避免视觉跳变 */
function BootSplash() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.bootSplash]}>
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  bootSplash: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F7CFF',
  },
});
