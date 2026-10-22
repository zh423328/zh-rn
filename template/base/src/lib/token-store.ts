import { SecureKeyEnum } from '@/tools/enum';

import { deleteSecureItem, getSecureItem, setSecureItem } from './secure-storage';

/**
 * 会话 token 的单一读取入口
 *
 * 为什么要单独一层：
 * - Axios 请求拦截器是同步/异步高频调用的，不能每次都读原生 keychain。
 * - token 刷新需要 single-flight（并发请求只刷新一次），刷新逻辑不能散落在拦截器里。
 * - 页面/Store 不直接接触 SecureStore，保证存储方式可替换。
 */

let accessToken: string | null = null;
let refreshToken: string | null = null;
let hydrated = false;

/** 刷新 token 的处理器，由 auth 模块在启动时注册 */
type RefreshHandler = (refreshToken: string) => Promise<{
  accessToken: string;
  refreshToken?: string;
}>;

let refreshHandler: RefreshHandler | null = null;
/** single-flight：并发 401 共享同一个刷新 Promise */
let refreshPromise: Promise<string | null> | null = null;
/** token 失效回调（登出 / 跳登录页），由 auth 模块注册 */
let onSessionExpired: (() => void) | null = null;

export function registerRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

export function registerSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

/** 从 SecureStore 恢复 token（应用启动时调用一次） */
export async function hydrateTokens(): Promise<void> {
  if (hydrated) return;
  const [access, refresh] = await Promise.all([
    getSecureItem(SecureKeyEnum.AccessToken),
    getSecureItem(SecureKeyEnum.RefreshToken),
  ]);
  accessToken = access;
  refreshToken = refresh;
  hydrated = true;
}

/** 同步读取 access token（拦截器使用） */
export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export async function saveTokens(tokens: {
  accessToken: string;
  refreshToken?: string | null;
}): Promise<void> {
  accessToken = tokens.accessToken;
  hydrated = true;
  await setSecureItem(SecureKeyEnum.AccessToken, tokens.accessToken);

  if (tokens.refreshToken !== undefined) {
    refreshToken = tokens.refreshToken;
    if (tokens.refreshToken) {
      await setSecureItem(SecureKeyEnum.RefreshToken, tokens.refreshToken);
    } else {
      await deleteSecureItem(SecureKeyEnum.RefreshToken);
    }
  }
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  hydrated = true;
  refreshPromise = null;
  await Promise.all([
    deleteSecureItem(SecureKeyEnum.AccessToken),
    deleteSecureItem(SecureKeyEnum.RefreshToken),
  ]);
}

/**
 * 刷新 access token（single-flight）
 * 并发调用只会真正触发一次刷新请求；无 refresh token 或刷新失败则登出。
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const currentRefreshToken = refreshToken;
  if (!currentRefreshToken || !refreshHandler) {
    notifySessionExpired();
    return null;
  }

  refreshPromise = (async () => {
    try {
      const result = await refreshHandler!(currentRefreshToken);
      await saveTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken ?? null,
      });
      return result.accessToken;
    } catch {
      await clearTokens();
      notifySessionExpired();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** 触发“登录态失效”流程（清 token + 通知上层跳登录页），保证只执行一次 */
export function notifySessionExpired(): void {
  onSessionExpired?.();
}
