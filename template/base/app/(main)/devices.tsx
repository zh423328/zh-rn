import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyView, ErrorView, LoadingView } from '@/components';
import { useDevices, useLockDevice, useUnlockDevice } from '@/features/devices/hooks';
import { toErrorMessage } from '@/features/auth/hooks';
import type { IDevice } from '@/features/devices/types';

/**
 * 设备列表
 *
 * 演示三态齐全：加载态 / 错误态（可重试）/ 空态 / 有数据。
 * 架构文档第 12 节要求「表格、设备列表应支持空态、加载态、错误态」。
 *
 * 注意：本页默认未接后端，首次进入会走错误态 —— 这是预期行为，
 * 用来验证 UI 骨架；接入 src/api/endpoints.ts 后即可出数据。
 */
export default function Devices() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isRefetching } = useDevices({
    page,
    pageSize: 20,
  });
  const lock = useLockDevice();
  const unlock = useUnlockDevice();

  const toggleLock = (device: IDevice) => {
    const mutation = device.status === 'locked' ? unlock : lock;
    mutation.mutate(device.id);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <LoadingView message="正在加载设备..." />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ErrorView message={toErrorMessage(error, '设备列表加载失败')} onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  const list = data?.list ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="w-full max-w-5xl flex-1 self-center px-5 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-text">设备</Text>
          <Text className="text-xs text-text-secondary">共 {data?.total ?? 0} 台</Text>
        </View>

        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          className="mt-4"
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          contentContainerClassName={list.length === 0 ? 'flex-1' : 'pb-6 gap-3'}
          ListEmptyComponent={
            <EmptyView
              title="还没有设备"
              description="设备注册后会显示在这里"
              actionLabel="刷新"
              onAction={() => refetch()}
            />
          }
          renderItem={({ item }) => (
            <View className="flex-row items-center rounded-xl bg-surface p-4 shadow-sm">
              <View className="flex-1">
                <Text className="text-base font-semibold text-text">{item.name}</Text>
                <Text className="mt-1 text-xs text-text-secondary">
                  {item.status === 'online'
                    ? '在线'
                    : item.status === 'locked'
                      ? '已锁定'
                      : '离线'}
                </Text>
              </View>
              <Pressable
                onPress={() => toggleLock(item)}
                disabled={lock.isPending || unlock.isPending}
                accessibilityRole="button"
                className="h-9 items-center justify-center rounded-lg border border-primary px-4 active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-xs font-semibold text-primary">
                  {item.status === 'locked' ? '解锁' : '锁定'}
                </Text>
              </Pressable>
            </View>
          )}
        />

        {list.length > 0 ? (
          <View className="flex-row items-center justify-center gap-4 py-3">
            <Pressable
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 active:opacity-60 disabled:opacity-40"
            >
              <Text className="text-sm text-text-secondary">上一页</Text>
            </Pressable>
            <Text className="text-sm text-text">第 {page} 页</Text>
            <Pressable
              onPress={() => setPage((p) => p + 1)}
              className="px-3 py-1 active:opacity-60"
            >
              <Text className="text-sm text-text-secondary">下一页</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
