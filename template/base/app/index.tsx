import { Redirect } from 'expo-router';

import { getAccessToken } from '@/lib/token-store';

/**
 * 路由入口（/）
 *
 * 只做一件事：根据登录态决定进入哪个分组。
 * 登录态同步的副作用逻辑在 app/_layout.tsx 的 SessionGate 中。
 */
export default function Index() {
  const isLoggedIn = Boolean(getAccessToken());
  // (main) 分组没有 index 路由，落到分组内的 home
  return <Redirect href={isLoggedIn ? '/(main)/home' : '/(auth)/login'} />;
}
