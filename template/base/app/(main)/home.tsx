import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { APP_NAME } from '@/config';
import { FadeInView, PressableScale, Screen, toast } from '@/components';
import { useUserStore } from '@/features/auth/store';
import { useLogout } from '@/features/auth/hooks';
import { useNotificationStore } from '@/features/notifications/notification-store';
import { useUpdate } from '@/features/updates/hooks';
import { getAppVersion } from '@/utils/platform';

/**
 * 首页
 *
 * 内容区用 max-w 约束 + 两列布局（md:），窄屏单列，不写死像素尺寸。
 *
 * 动效说明：
 * - 三块内容用 FadeInView 做交错入场（0 / 80 / 160ms），
 *   页面像「铺开」而不是瞬间出现。
 * - 主要操作按钮用 PressableScale，按下有轻微回弹，
 *   比单纯 active:opacity 更有「按到了」的确认感。
 * - 两处动画都遵循系统「减弱动态效果」设置（ReduceMotion.System 的默认行为）。
 */
export default function Home() {
  const userInfo = useUserStore((s) => s.userInfo);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const realtimeStatus = useNotificationStore((s) => s.status);
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast.success('已退出登录');
        router.replace('/(auth)/login');
      },
    });
  };

  const update = useUpdate();

  // 手动检查：统一入口，内部会判断走 APK 还是 OTA
  const handleCheckUpdate = async () => {
    const result = await update.check();
    if (!result) {
      toast.error('检查更新失败');
      return;
    }
    if (!result.hasUpdate) toast.info('当前已是最新版本');
    // 有更新时由 UpdateDialog 接管展示
  };

  return (
    <Screen className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        {/* 欢迎区 */}
        <View className="w-full max-w-5xl self-center">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-text">{APP_NAME}</Text>
              <Text className="mt-1 text-xs text-text-secondary">
                Expo SDK 57 · Router v57 · NativeWind v5 · RN 0.86
              </Text>
            </View>
            <View className="rounded-full bg-surface px-3 py-1.5">
              <Text className="text-xs text-text-secondary">
                实时：{realtimeStatus === 'connected' ? '已连接' : '未连接'}
              </Text>
            </View>
          </View>

          {/* 横屏两列：窄屏单列、宽屏并排；两张卡片按 0 / 80ms 交错入场 */}
          <View className="mt-6 gap-4 md:flex-row">
            {/* 账户卡片 */}
            <FadeInView delay={0} style={{ flex: 1 }}>
              <View className="flex-1 rounded-2xl bg-surface p-5 shadow-sm">
                <View className="flex-row items-center">
                  <View className="size-12 items-center justify-center rounded-full bg-primary">
                    <Text className="text-lg font-bold text-primary-foreground">
                      {userInfo?.nickname?.slice(0, 1) ?? '?'}
                    </Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-text">
                      {userInfo?.nickname ?? '未登录'}
                    </Text>
                    <Text className="mt-0.5 text-xs text-text-secondary">
                      角色：{userInfo?.role ?? '-'} · v{getAppVersion()}
                    </Text>
                  </View>
                </View>

                <PressableScale
                  onPress={handleLogout}
                  disabled={logout.isPending}
                  accessibilityLabel={logout.isPending ? '退出中' : '退出登录'}
                  rippleVariant="onPrimary"
                  className="mt-4 h-11 items-center justify-center rounded-xl bg-danger disabled:opacity-60"
                >
                  <Text className="text-sm font-semibold text-white">
                    {logout.isPending ? '退出中...' : '退出登录'}
                  </Text>
                </PressableScale>
              </View>
            </FadeInView>

            {/* 通知卡片 */}
            <FadeInView delay={80} style={{ flex: 1 }}>
              <View className="flex-1 rounded-2xl bg-surface p-5 shadow-sm">
                <Text className="text-sm font-semibold text-text">消息通知</Text>
                <Text className="mt-2 text-3xl font-bold text-primary">{unreadCount}</Text>
                <Text className="mt-1 text-xs text-text-secondary">条未读消息</Text>
                <PressableScale
                  onPress={() => router.push('/(main)/devices')}
                  accessibilityLabel="查看设备"
                  rippleVariant="onSurface"
                  className="mt-3 h-10 items-center justify-center rounded-xl border border-primary"
                >
                  <Text className="text-sm font-semibold text-primary">查看设备</Text>
                </PressableScale>
              </View>
            </FadeInView>
          </View>

          {/* 工具区：第 3 个入场 */}
          <FadeInView delay={160}>
            <View className="mt-4 rounded-2xl bg-surface p-5 shadow-sm">
              <Text className="text-sm font-semibold text-text">运维工具</Text>
              <PressableScale
                onPress={handleCheckUpdate}
                accessibilityLabel="检查更新"
                className="mt-3 h-11 items-center justify-center rounded-xl bg-primary"
              >
                <Text className="text-sm font-semibold text-primary-foreground">检查更新</Text>
              </PressableScale>
              <Text className="mt-2 text-xs text-text-secondary">
                开发环境不检查；正式包中会先比对服务端版本， 再决定走 OTA 热更新还是 APK 更新。详见
                docs/app-updates-guide.md
              </Text>
            </View>
          </FadeInView>
        </View>
      </ScrollView>
    </Screen>
  );
}
