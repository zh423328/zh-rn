import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_NAME } from '@/config';
import { useTokenStore, useUserStore } from '@/store';
import { checkForOtaUpdate } from '@/utils/updates';

/**
 * 首页（对应 uni 版 pages/index/index.vue）
 * 展示：登录态卡片、退出登录、OTA 检查演示
 */
export default function Index() {
  const token = useTokenStore((s) => s.token);
  const logout = useTokenStore((s) => s.logout);
  const userInfo = useUserStore((s) => s.userInfo);

  const handleOtaCheck = () => {
    checkForOtaUpdate({ silent: false });
  };

  const handleGoLogin = () => {
    router.push('/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10">
        {/* 顶部欢迎区 */}
        <View className="mt-4">
          <Text className="text-3xl font-bold text-text">{APP_NAME}</Text>
          <Text className="mt-1 text-sm text-text-secondary">
            Expo SDK 55 · Expo Router v7 · NativeWind v5
          </Text>
        </View>

        {/* 登录态卡片 */}
        <View className="mt-6 rounded-2xl bg-surface p-5 shadow-sm">
          {userInfo ? (
            <>
              <View className="flex-row items-center">
                <View className="size-12 items-center justify-center rounded-full bg-primary">
                  <Text className="text-lg font-bold text-primary-foreground">
                    {userInfo.nickname.slice(0, 1)}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-text">{userInfo.nickname}</Text>
                  <Text className="mt-0.5 text-xs text-text-secondary">
                    角色：{userInfo.role} · 已登录
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={logout}
                className="mt-4 h-11 items-center justify-center rounded-xl bg-danger active:opacity-80"
              >
                <Text className="text-sm font-semibold text-white">退出登录</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-base font-semibold text-text">当前未登录</Text>
              <Text className="mt-1 text-xs text-text-secondary">
                演示账号 admin / 123456，或验证码 123456
              </Text>
            </>
          )}
        </View>

        {/* token 状态 */}
        <View className="mt-4 rounded-2xl bg-surface p-5 shadow-sm">
          <Text className="text-sm font-semibold text-text">Token 状态（Zustand + AsyncStorage 持久化）</Text>
          <Text className="mt-2 text-xs text-text-secondary" numberOfLines={1}>
            {token ? token : '未获取到 token'}
          </Text>
        </View>

        {/* 功能演示 */}
        <View className="mt-4 rounded-2xl bg-surface p-5 shadow-sm">
          <Text className="text-sm font-semibold text-text">功能演示</Text>
          <Pressable
            onPress={handleOtaCheck}
            className="mt-3 h-11 items-center justify-center rounded-xl bg-primary active:opacity-80"
          >
            <Text className="text-sm font-semibold text-primary-foreground">检查 OTA 热更新</Text>
          </Pressable>
          <Text className="mt-2 text-xs text-text-secondary">
            基于 expo-updates，正式构建后生效，发布流程见 docs/ota-updates-guide.md
          </Text>
        </View>

        {/* 未登录时的登录入口 */}
        {!userInfo && (
          <Pressable
            onPress={handleGoLogin}
            className="mt-6 h-12 items-center justify-center rounded-xl bg-primary active:opacity-80"
          >
            <Text className="text-base font-semibold text-primary-foreground">去登录</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

