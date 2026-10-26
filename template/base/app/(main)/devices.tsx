import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { EmptyView, ErrorView, LoadingView, Screen } from '@/components';
import { useDevices, useLockDevice, useUnlockDevice } from '@/features/devices/hooks';
import { toErrorMessage } from '@/features/auth/hooks';
import type { IDevice } from '@/features/devices/types';
import { ripple } from '@/theme';

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
      <Screen className="flex-1 bg-background" edges={['top']}>
        <LoadingView message="正在加载设备..." />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen className="flex-1 bg-background" edges={['top']}>
        <ErrorView message={toErrorMessage(error, '设备列表加载失败')} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const list = data?.list ?? [];

  return (
    <Screen className="flex-1 bg-background" edges={['top']}>
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
          renderItem={({ item, index }) => (
            /*
             * 列表项入场：按索引交错（每项 +50ms），最多叠加到 400ms。
             * 用 entering 而不是包一层 FadeInView：
             * FlatList 复用单元格，若用包裹组件，回收后的行不会重播动画；
             * entering 由 Reanimated 在挂载时触发，语义正确且不增加树深度。
             * layout 负责删除/重排时的平滑过渡。
             */
            <Animated.View
              entering={FadeInDown.delay(Math.min(index * 50, 400)).duration(260)}
              layout={LinearTransition.springify().damping(18)}
              className="flex-row items-center rounded-xl bg-surface p-4 shadow-sm"
            >
              <View className="flex-1">
                <Text className="text-base font-semibold text-text">{item.name}</Text>
                <Text className="mt-1 text-xs text-text-secondary">
                  {item.status === 'online' ? '在线' : item.status === 'locked' ? '已锁定' : '离线'}
                </Text>
              </View>
              <Pressable
                android_ripple={ripple.onSurface}
                onPress={() => toggleLock(item)}
                disabled={lock.isPending || unlock.isPending}
                accessibilityRole="button"
                className="h-9 items-center justify-center rounded-lg border border-primary px-4 active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-xs font-semibold text-primary">
                  {item.status === 'locked' ? '解锁' : '锁定'}
                </Text>
              </Pressable>
            </Animated.View>
          )}
        />

        {list.length > 0 ? (
          <View className="flex-row items-center justify-center gap-4 py-3">
            <Pressable
              android_ripple={ripple.onPlain}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 active:opacity-60 disabled:opacity-40"
            >
              <Text className="text-sm text-text-secondary">上一页</Text>
            </Pressable>
            <Text className="text-sm text-text">第 {page} 页</Text>
            <Pressable
              android_ripple={ripple.onPlain}
              onPress={() => setPage((p) => p + 1)}
              className="px-3 py-1 active:opacity-60"
            >
              <Text className="text-sm text-text-secondary">下一页</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
