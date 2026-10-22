import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AppError } from '@/api/errors';
import { clearTokens, hydrateTokens, saveTokens } from '@/lib/token-store';
import { clearUserScopedQueries } from '@/lib/query-client';

import { loginByAccount, loginByPhone, logoutRequest, sendVerificationCode } from './api';
import { useUserStore } from './store';
import type { ILoginByPhoneReq, ILoginReq, ILoginRes } from './types';

/**
 * 认证相关的 Query hooks
 *
 * 约定：写操作走 useMutation，读操作走 useQuery。
 * 登录成功后：token → SecureStore（经 token-store），用户资料 → Zustand。
 */

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
};

/** 登录成功后落库 */
async function persistSession(result: ILoginRes) {
  await saveTokens({
    accessToken: result.access_token,
    refreshToken: result.refresh_token ?? null,
  });
  useUserStore.getState().setUserInfo(result.user);
}

export function useLoginByAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ILoginReq) => loginByAccount(payload),
    onSuccess: async (result) => {
      await persistSession(result);
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}

export function useLoginByPhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ILoginByPhoneReq) => loginByPhone(payload),
    onSuccess: async (result) => {
      await persistSession(result);
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}

export function useSendVerificationCode() {
  return useMutation({
    mutationFn: (phoneNumber: string) => sendVerificationCode({ phoneNumber }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await logoutRequest();
      } catch {
        // 后端注销失败不应阻断本地登出
      }
      await clearTokens();
      useUserStore.getState().clearUserInfo();
      clearUserScopedQueries();
      // 清理全部缓存，避免下一个登录用户看到上一个人的数据
      queryClient.clear();
    },
  });
}

/**
 * 会话初始化：从 SecureStore 恢复 token
 *
 * 返回 isReady=false 时根布局应继续显示 Splash，避免闪屏。
 */
export function useSessionBootstrap() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await hydrateTokens();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error('会话初始化失败'));
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { isReady, error };
}

/** 把任意错误转成可展示文案 */
export function toErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
