import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deviceApi } from './api';

/**
 * 设备 Query hooks
 *
 * 缓存键设计：all → list(params) / detail(id)
 * mutation 成功后按需失效，不要无脑清空全部缓存。
 */
export const deviceKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceKeys.all, 'list'] as const,
  list: (params: { page: number; pageSize?: number }) =>
    [...deviceKeys.lists(), params] as const,
  details: () => [...deviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...deviceKeys.details(), id] as const,
};

export function useDevices(params: { page: number; pageSize?: number }) {
  return useQuery({
    queryKey: deviceKeys.list(params),
    queryFn: () => deviceApi.list(params),
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: deviceKeys.detail(id),
    queryFn: () => deviceApi.detail(id),
    enabled: Boolean(id),
  });
}

export function useLockDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deviceId: string) => deviceApi.lock(deviceId),
    onSuccess: async (_data, deviceId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: deviceKeys.detail(deviceId) }),
      ]);
    },
  });
}

export function useUnlockDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deviceId: string) => deviceApi.unlock(deviceId),
    onSuccess: async (_data, deviceId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: deviceKeys.detail(deviceId) }),
      ]);
    },
  });
}

export function useRegisterDevice() {
  return useMutation({
    mutationFn: () => deviceApi.register(),
  });
}
