import { QueryClient } from '@tanstack/react-query';

import { AppError } from '@/api/errors';
import { AppErrorCode } from '@/tools/enum';

/**
 * TanStack Query 全局配置
 *
 * 设计意图：
 * - 服务端数据只由 Query 管路，不复制进 Zustand（避免两份真相）。
 * - 401 / 业务鉴权失败不重试，交给 token 刷新或登出流程处理。
 * - 移动端没有「窗口聚焦」概念，关闭 refetchOnWindowFocus。
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      // 鉴权失败与客户端错误没有重试价值
      retry: (failureCount, error) => {
        if (error instanceof AppError) {
          if (
            error.code === AppErrorCode.Unauthorized ||
            error.code === AppErrorCode.Business
          ) {
            return false;
          }
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * 登出 / 切换用户时清理用户私有缓存。
 * 不要清整个 client —— 会连带把公共配置类缓存打掉。
 */
export function clearUserScopedQueries(): void {
  queryClient.removeQueries({ queryKey: ['auth'] });
  queryClient.removeQueries({ queryKey: ['devices'] });
  queryClient.removeQueries({ queryKey: ['notifications'] });
}
