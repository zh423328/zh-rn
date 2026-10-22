import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

import { apiClient } from '@/api/client';
import { logger } from '@/utils/logger';

import {
  checkOtaUpdate,
  downloadOtaUpdate,
  applyOtaUpdate,
  isOtaAvailable,
} from './ota';
import { needsApkUpdate, isForceUpdate } from './version';
import type { IUpdateDecision, IVersionInfo } from './types';

/**
 * 版本信息服务
 *
 * 后端接口约定（可按实际后端调整 endpoints 与字段名）：
 * GET /app/version?platform=android&version=1.0.0
 * → { code, data: { version, versionCode, runtimeVersion, apkUrl, ... } }
 */

/** 版本检查接口路径 */
const VERSION_ENDPOINT = '/app/version';

/** 本地当前版本信息（来自原生，非写死） */
export function getLocalVersionInfo() {
  return {
    version: Application.nativeApplicationVersion ?? '1.0.0',
    versionCode: Number(Application.nativeBuildVersion ?? 1),
    // runtimeVersion 必须和 app.json 一致，用于判断原生是否变化
    runtimeVersion: Updates.runtimeVersion ?? null,
  };
}

/** 拉取服务端最新版本信息 */
export async function fetchVersionInfo(): Promise<IVersionInfo> {
  const local = getLocalVersionInfo();
  return apiClient.get<IVersionInfo>(VERSION_ENDPOINT, {
    platform: 'android',
    version: local.version,
    versionCode: local.versionCode,
    runtimeVersion: local.runtimeVersion,
  });
}

/**
 * 统一的更新检查入口
 *
 * 决策顺序：
 * 1. 先问服务端「最新版本是什么」
 * 2. 判断是否需要换 APK（原生变了 / 版本号更新）
 * 3. 如果不需要 APK，再检查 OTA 是否有新 JS
 *
 * 这样做的原因：APK 更新优先级高于 OTA。
 * 如果原生已不兼容，OTA 包即使下载了也可能跑不起来。
 */
export async function checkForUpdates(): Promise<IUpdateDecision> {
  const local = getLocalVersionInfo();

  const decision: IUpdateDecision = {
    kind: 'none',
    hasUpdate: false,
    force: false,
    currentVersion: local.version,
    latestVersion: local.version,
    otaAvailable: false,
    apkAvailable: false,
  };

  // 开发环境直接跳过：
  // - OTA 在 dev / Expo Go 下 isEnabled 恒为 false，检查必然无效
  // - APK 自更新在调试阶段没有意义，还会打网络日志干扰排查
  // 需要联调更新流程时，用 development build 或正式包验证。
  if (__DEV__) {
    logger.debug('updates', '开发环境跳过更新检查');
    return decision;
  }

  // ---- 1. 服务端版本信息 ----
  let info: IVersionInfo | undefined;
  try {
    info = await fetchVersionInfo();
    decision.info = info;
    decision.latestVersion = info.version;
  } catch (error) {
    // 后端不可用不应阻断 App 使用，退化为只检查 OTA
    logger.warn('updates', '版本接口不可用，仅检查 OTA', error);
  }

  // ---- 2. APK 判断 ----
  if (info) {
    const apkNeeded = needsApkUpdate({
      currentVersion: local.version,
      currentVersionCode: local.versionCode,
      currentRuntimeVersion: local.runtimeVersion ?? undefined,
      info: {
        version: info.version,
        versionCode: info.versionCode,
        runtimeVersion: info.runtimeVersion,
      },
    });

    if (apkNeeded && info.apkUrl) {
      decision.apkAvailable = true;
      decision.kind = 'apk';
      decision.hasUpdate = true;
      decision.force = isForceUpdate({
        currentVersion: local.version,
        forceUpdate: info.forceUpdate,
        minSupportedVersion: info.minSupportedVersion,
      });
    }
  }

  // ---- 3. OTA 判断（仅在没有 APK 更新时才有意义）----
  if (!decision.apkAvailable && isOtaAvailable()) {
    const otaReady = await checkOtaUpdate();
    if (otaReady) {
      decision.otaAvailable = true;
      decision.kind = 'ota';
      decision.hasUpdate = true;
      decision.force = false; // OTA 一般不强制，避免打断用户
    }
  }

  logger.debug('updates', '更新检查结果', {
    kind: decision.kind,
    current: decision.currentVersion,
    latest: decision.latestVersion,
    force: decision.force,
  });

  return decision;
}

/**
 * 执行 OTA 更新（下载 + 重载）
 * 返回是否成功应用。
 */
export async function applyOtaNow(): Promise<boolean> {
  const downloaded = await downloadOtaUpdate();
  if (!downloaded) return false;
  await applyOtaUpdate();
  return true;
}

export { isOtaAvailable };
