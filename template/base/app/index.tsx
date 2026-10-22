import { Redirect } from 'expo-router';

import { resolveIsLoggedIn } from '@/features/auth/session';

/**
 * 路由入口（/）
 *
 * 职责：根据登录态把用户送到对应分组。
 *
 * 为什么必须在这里做跳转：
 * Expo Router 打开应用时会先落到 `/`（本文件）。如果这里只渲染一个 Loading
 * 而不跳转，用户就会永远停在这一页转圈 —— 这正是之前 Web / Android 白屏的原因。
 *
 * 关于 <Redirect> 的顾虑（已排除）：
 * 它自身渲染为 null，但如果导航失败，会表现为「空白」而非「转圈」，
 * 可据此区分故障类型。配合下方 SessionGate 的就绪前置条件，
 * 保证执行到这里时 token 已从 SecureStore 恢复完毕。
 */
export default function Index() {
  const isLoggedIn = resolveIsLoggedIn();
  return <Redirect href={isLoggedIn ? '/(main)/home' : '/(auth)/login'} />;
}
