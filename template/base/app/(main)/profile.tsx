import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Screen, toast } from '@/components';
import { useLogout } from '@/features/auth/hooks';
import { useUserStore } from '@/features/auth/store';
import { getInstallId } from '@/lib/device-install-id';
import { useRegisterDevice } from '@/features/devices/hooks';
import { getDeviceContext } from '@/utils/platform';
import { useEffect, useState } from 'react';

/** 我的：账号信息、设备标识、登出 */
export default function Profile() {
  const userInfo = useUserStore((s) => s.userInfo);
  const logout = useLogout();
  const registerDevice = useRegisterDevice();
  const [installId, setInstallId] = useState('');

  useEffect(() => {
    getInstallId().then(setInstallId).catch(() => setInstallId('获取失败'));
  }, []);

  const ctx = getDeviceContext();

  const handleRegister = () => {
    registerDevice.mutate(undefined, {
      onSuccess: () => toast.success('设备注册成功'),
      onError: (error) => toast.error('设备注册失败', String((error as Error).message ?? '')),
    });
  };

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast.success('已退出登录');
        router.replace('/(auth)/login');
      },
    });
  };

  return (
    <Screen className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <View className="w-full max-w-5xl self-center">
          <Text className="text-xl font-bold text-text">我的</Text>

          <View className="mt-4 rounded-2xl bg-surface p-5 shadow-sm">
            <Text className="text-sm font-semibold text-text">账号</Text>
            <Row label="昵称" value={userInfo?.nickname ?? '-'} />
            <Row label="账号" value={userInfo?.username ?? '-'} />
            <Row label="角色" value={userInfo?.role ?? '-'} />
          </View>

          <View className="mt-4 rounded-2xl bg-surface p-5 shadow-sm">
            <Text className="text-sm font-semibold text-text">设备信息</Text>
            <Text className="mt-1 text-xs text-text-secondary">
              安装级 UUID（非硬件 ID，卸载重装会变化）
            </Text>
            <Text className="mt-2 text-xs text-text" selectable numberOfLines={2}>
              {installId || '读取中...'}
            </Text>
            <Row label="平台" value={`${ctx.platform} ${ctx.platformVersion}`} />
            <Row label="应用版本" value={`${ctx.appVersion} (${ctx.buildVersion})`} />

            <Pressable
              onPress={handleRegister}
              disabled={registerDevice.isPending}
              accessibilityRole="button"
              className="mt-3 h-10 items-center justify-center rounded-xl border border-primary active:opacity-80 disabled:opacity-60"
            >
              <Text className="text-sm font-semibold text-primary">
                {registerDevice.isPending ? '注册中...' : '注册本机到服务端'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleLogout}
            disabled={logout.isPending}
            accessibilityRole="button"
            className="mt-6 h-12 items-center justify-center rounded-xl bg-danger active:opacity-80 disabled:opacity-60"
          >
            <Text className="text-base font-semibold text-white">
              {logout.isPending ? '退出中...' : '退出登录'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mt-2 flex-row items-center justify-between">
      <Text className="text-xs text-text-secondary">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-xs text-text" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
