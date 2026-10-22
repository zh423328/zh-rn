export * from './debounce';
export * from './helpers';

import { router } from 'expo-router';

/**
 * 回到首页（登录成功后使用）
 */
export function reLaunchToHome() {
  router.replace('/');
}
