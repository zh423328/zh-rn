import { getAccessToken } from '@/lib/token-store';
import { useUserStore } from '@/features/auth/store';

/**
 * 登录态判定的唯一来源
 *
 * 为什么必须统一：
 * 之前 index.tsx 用 `Boolean(getAccessToken())`，而根布局的 Protected 守卫用
 * `Boolean(getAccessToken() ?? userInfo)`。两者不一致会产生死锁：
 *
 *   token 丢失但 userInfo 还在（典型场景：Web 端 SecureStore 是空实现，
 *   而 zh:user 存在 localStorage）时
 *   → index 认为「未登录」，跳到 /login
 *   → 但 Protected 认为「已登录」，把 (auth) 分组拦住
 *   → 两个分组都不可访问 → 整屏空白，且没有任何报错
 *
 * 现在两处都调用本函数，判断结果必然一致。
 */
export function resolveIsLoggedIn(): boolean {
  // token 是权威依据；token 不可用时退回用户信息缓存，
  // 避免「token 读取失败但用户确实登录过」被误判为未登录。
  const hasToken = Boolean(getAccessToken());
  if (hasToken) return true;

  return Boolean(useUserStore.getState().userInfo);
}
