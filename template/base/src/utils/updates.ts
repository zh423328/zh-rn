import * as Updates from 'expo-updates';
import Toast from 'react-native-toast-message';

/**
 * OTA 热更新检查（基于 expo-updates）
 *
 * 原理与 uni-app 的 wgt 热更新类似：不重新发应用商店版本，
 * 只下发 JS 层更新包。发布方式见 docs/ota-updates-guide.md。
 *
 * 注意：Expo Go 沙箱环境下检查会静默跳过，需在正式构建（EAS Build）中生效。
 */

interface CheckOptions {
  /** 是否静默模式：无更新时不提示，默认 true */
  silent?: boolean;
}

export async function checkForOtaUpdate({ silent = true }: CheckOptions = {}): Promise<boolean> {
  // 开发环境 / Expo Go 下不检查
  if (__DEV__ || !Updates.isEnabled) {
    return false;
  }

  try {
    const result = await Updates.checkForUpdateAsync();

    if (!result.isAvailable) {
      if (!silent) {
        Toast.show({ type: 'info', text1: '当前已是最新版本' });
      }
      return false;
    }

    Toast.show({ type: 'info', text1: '发现新版本，正在更新...' });
    await Updates.fetchUpdateAsync();
    // 下载完成后重载应用进入新版本
    await Updates.reloadAsync();
    return true;
  } catch (error) {
    console.error('[updates] OTA 检查失败:', error);
    if (!silent) {
      Toast.show({ type: 'error', text1: '更新检查失败，请稍后重试' });
    }
    return false;
  }
}
