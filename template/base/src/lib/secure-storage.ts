import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { logger } from '@/utils/logger';

/**
 * 安全存储封装
 *
 * 用途边界：
 * - 只放「小型敏感值」：access token、refresh token 等。
 * - 不要放数据库、图片、大 JSON 对象 —— SecureStore 有大小与性能限制。
 * - 非敏感数据（用户信息、UI 偏好）请用 AsyncStorage。
 *
 * 所有读写都带内存缓存：拦截器每次请求都要读 token，
 * 不能每次都走一次原生 keychain 调用。
 *
 * Web 端特别说明：
 * expo-secure-store 在 Web 上的实现是空对象（`export default {}`），
 * 调用任何方法都会抛错，导致 token 读不到、登录态无法持久化。
 * 这在 Web 上表现为「登录成功后刷新页面就丢失登录态 / 白屏」。
 * 因此 Web 端降级到 AsyncStorage（localStorage）。
 *
 * 安全边界：Web 没有等价的安全存储，localStorage 可被 XSS 读取。
 * 这是平台限制而非实现缺陷。生产 Web 端建议改用 HttpOnly Cookie + 短时效 token，
 * 不要把长期凭证放在 localStorage。
 */

const isWeb = Platform.OS === 'web';

const cache = new Map<string, string | null>();

/** SecureStore 在当前平台是否可用（Web 端恒为 false） */
async function isSecureStoreAvailable(): Promise<boolean> {
  if (isWeb) return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/** 读取敏感值；不存在或读取失败均返回 null */
export async function getSecureItem(key: string): Promise<string | null> {
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    let value: string | null = null;

    if (await isSecureStoreAvailable()) {
      value = await SecureStore.getItemAsync(key);
    } else if (isWeb) {
      value = await AsyncStorage.getItem(key);
    }

    cache.set(key, value);
    return value;
  } catch (error) {
    logger.warn('secure-storage', `读取失败: ${key}`, error);
    cache.set(key, null);
    return null;
  }
}

/** 写入敏感值 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  cache.set(key, value);

  try {
    if (await isSecureStoreAvailable()) {
      await SecureStore.setItemAsync(key, value, {
        // 设备解锁后可读，且不随备份迁移到新设备
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } else if (isWeb) {
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    logger.warn('secure-storage', `写入失败: ${key}`, error);
  }
}

/** 删除敏感值 */
export async function deleteSecureItem(key: string): Promise<void> {
  cache.delete(key);

  try {
    if (await isSecureStoreAvailable()) {
      await SecureStore.deleteItemAsync(key);
    } else if (isWeb) {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    logger.warn('secure-storage', `删除失败: ${key}`, error);
  }
}

/** 仅供登出等场景清空内存缓存（不会删除磁盘数据） */
export function clearSecureMemoryCache(): void {
  cache.clear();
}
