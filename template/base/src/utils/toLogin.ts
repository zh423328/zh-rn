import { router } from 'expo-router';

/**
 * 跳转到登录页
 * 由 request.ts 在 token 失效（401）时调用，也可在业务里手动调用
 */
export function toLoginPage() {
  // replace 替换当前页面，避免登录后返回又回到已失效的页面
  router.replace('/login');
}
