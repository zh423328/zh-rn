import { Platform } from 'react-native';
import * as Application from 'expo-application';

import { logger } from './logger';

/**
 * 平台相关的小工具
 */

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';
export const isWeb = Platform.OS === 'web';
export const isNative = !isWeb;

/** 小屏 / 横屏等场景判断用的尺寸断点（与 global.css 的 @theme 断点保持一致） */
export const BREAKPOINTS = {
  md: 768,
  lg: 1024,
} as const;

/** 应用版本（来自原生构建，非 JS 内写死） */
export function getAppVersion(): string {
  return Application.nativeApplicationVersion ?? '1.0.0';
}

/** 构建号 */
export function getBuildVersion(): string {
  return Application.nativeBuildVersion ?? '0';
}

/**
 * 上报给服务端的设备环境信息。
 * 只放设备/应用维度信息，不放用户身份信息。
 */
export function getDeviceContext() {
  return {
    platform: Platform.OS,
    platformVersion: String(Platform.Version),
    appVersion: getAppVersion(),
    buildVersion: getBuildVersion(),
  };
}

/** 应用启动时打印一次环境信息，便于排查构建问题 */
export function logEnvironmentOnce(): void {
  logger.info('env', '应用启动', getDeviceContext());
}
