import * as SecureStore from 'expo-secure-store';

/**
 * SecureStore 轻量封装
 *
 * 用途边界（重要）：
 * - 只放「小型敏感值」：access token、refresh token 等。
 * - 不要放数据库、图片、大 JSON 对象——SecureStore 有大小与性能限制。
 * - 非敏感数据（用户信息、UI 偏好）请用 AsyncStorage。
 *
 * 所有读写都带内存缓存：拦截器每次请求都要读 token，
 * 不能每次都走一次原生 keychain 调用。
 */

const cache = new Map<string, string | null>();

async function ensureAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/** 读取敏感值；不存在或读取失败均返回 null */
export async function getSecureItem(key: string): Promise<string | null> {
  if (cache.has(key)) return cache.get(key) ?? null;

  if (!(await ensureAvailable())) {
    cache.set(key, null);
    return null;
  }

  try {
    const value = await SecureStore.getItemAsync(key);
    cache.set(key, value);
    return value;
  } catch (error) {
    console.warn('[secure-storage] 读取失败', key, error);
    cache.set(key, null);
    return null;
  }
}

/** 写入敏感值 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  cache.set(key, value);
  if (!(await ensureAvailable())) return;

  try {
    await SecureStore.setItemAsync(key, value, {
      // 设备解锁后可读，且不随备份迁移到新设备
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (error) {
    console.warn('[secure-storage] 写入失败', key, error);
  }
}

/** 删除敏感值 */
export async function deleteSecureItem(key: string): Promise<void> {
  cache.delete(key);
  if (!(await ensureAvailable())) return;

  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn('[secure-storage] 删除失败', key, error);
  }
}

/** 仅供登出等场景清空内存缓存（不会删除磁盘数据） */
export function clearSecureMemoryCache(): void {
  cache.clear();
}
