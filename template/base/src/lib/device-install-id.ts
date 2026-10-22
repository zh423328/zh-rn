import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { StorageEnum } from '@/tools/enum';

/**
 * 安装级设备标识
 *
 * 定位：这是「本次安装实例」的随机 UUID，不是硬件永久 ID。
 * - 首次启动生成并持久化，后续启动复用。
 * - 卸载重装 / 清除数据后会重新生成 —— 这是预期行为。
 * - 登录或设备注册时上报给服务端，由服务端建立设备档案并分配业务设备 ID。
 *
 * 明确不要做的事：
 * - 不要用 IMEI / 序列号 / MAC（Android 10+ 基本不可得，也涉及合规风险）。
 * - 不要把 Android ID 或 iOS IDFV 当作跨重装、跨平台的统一标识。
 */

let cachedId: string | null = null;

function generateUuid(): string {
  // expo-crypto 的 randomUUID 基于安全随机源
  return Crypto.randomUUID();
}

/** 获取安装级设备 ID（不存在则创建） */
export async function getInstallId(): Promise<string> {
  if (cachedId) return cachedId;

  try {
    const stored = await AsyncStorage.getItem(StorageEnum.InstallId);
    if (stored) {
      cachedId = stored;
      return stored;
    }

    const created = generateUuid();
    await AsyncStorage.setItem(StorageEnum.InstallId, created);
    cachedId = created;
    return created;
  } catch (error) {
    // 持久化失败时退回内存态，保证本次运行可用
    console.warn('[device-install-id] 持久化失败，使用临时 ID', error);
    cachedId ??= generateUuid();
    return cachedId;
  }
}

/**
 * 重置安装级设备 ID（仅在“恢复出厂/切换账号归属”等明确业务场景下调用）
 */
export async function resetInstallId(): Promise<string> {
  cachedId = null;
  await AsyncStorage.removeItem(StorageEnum.InstallId);
  return getInstallId();
}
