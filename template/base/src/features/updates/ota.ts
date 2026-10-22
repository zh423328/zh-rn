import * as Updates from 'expo-updates';

import { logger } from '@/utils/logger';

import type { IDownloadProgress } from './types';

/**
 * OTA 热更新（基于 expo-updates）
 *
 * 服务端可以是：
 * - EAS Update（url 形如 https://u.expo.dev/<projectId>）
 * - 自托管服务（需实现 Expo Updates 协议，url 指向你自己的域名）
 *
 * 客户端代码完全一致，只换 app.json 的 updates.url，这是刻意设计。
 */

/** OTA 是否在当前环境可用（开发模式 / Expo Go / 配置缺失时为 false） */
export function isOtaAvailable(): boolean {
  return !__DEV__ && Updates.isEnabled;
}

/** 当前运行的更新是否为内嵌包（而非下载来的） */
export function isEmbeddedLaunch(): boolean {
  return Updates.isEmbeddedLaunch;
}

/** 当前更新 ID，便于排查线上问题 */
export function getCurrentUpdateId(): string | null {
  return Updates.updateId ?? null;
}

/** 运行环境摘要，用于「关于」页面或诊断 */
export function getOtaDiagnostics() {
  return {
    enabled: Updates.isEnabled,
    channel: Updates.channel ?? null,
    runtimeVersion: Updates.runtimeVersion ?? null,
    updateId: Updates.updateId ?? null,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    createdAt: Updates.createdAt ? Updates.createdAt.toISOString() : null,
    launchDuration: Updates.launchDuration ?? null,
  };
}

/**
 * 检查 OTA 是否有新版本
 * @returns 是否可用更新；不可用或出错均返回 false
 */
export async function checkOtaUpdate(): Promise<boolean> {
  if (!isOtaAvailable()) {
    logger.debug('updates', 'OTA 不可用（开发环境 / 未配置 / Expo Go）');
    return false;
  }

  try {
    const result = await Updates.checkForUpdateAsync();
    return Boolean(result.isAvailable);
  } catch (error) {
    logger.warn('updates', 'OTA 检查失败', error);
    return false;
  }
}

/**
 * 下载 OTA 更新
 *
 * 注意：这里只下载，不 reload。
 * 何时重载由调用方决定（前台静默 / 提示用户 / 下次启动），
 * 立刻 reload 会打断用户操作，是很差体验。
 */
export async function downloadOtaUpdate(): Promise<boolean> {
  if (!isOtaAvailable()) return false;

  try {
    const result = await Updates.fetchUpdateAsync();
    return Boolean(result.isNew);
  } catch (error) {
    logger.error('updates', 'OTA 下载失败', error);
    return false;
  }
}

/** 应用已下载的更新（会重启 JS 运行时） */
export async function applyOtaUpdate(): Promise<void> {
  if (!isOtaAvailable()) return;
  await Updates.reloadAsync();
}

/**
 * 完整的 OTA 流程：检查 → 下载 → 重载
 *
 * 适合「用户主动点检查更新」的场景。
 * 自动检查建议用 checkOtaUpdate + downloadOtaUpdate，重载时机另定。
 */
export async function runOtaUpdateFlow(
  onProgress?: (progress: IDownloadProgress) => void,
): Promise<{ updated: boolean; reason?: string }> {
  if (!isOtaAvailable()) {
    return { updated: false, reason: '当前环境不支持 OTA（需正式构建）' };
  }

  const available = await checkOtaUpdate();
  if (!available) return { updated: false, reason: '已是最新版本' };

  // expo-updates 不直接给进度百分比，这里用阶段回调占位，
  // 需要真实进度时可在自托管服务端返回 Content-Length 后用轮询实现。
  onProgress?.({ downloaded: 0, total: 0, ratio: 0 });

  const downloaded = await downloadOtaUpdate();
  if (!downloaded) return { updated: false, reason: '下载失败，请稍后重试' };

  onProgress?.({ downloaded: 1, total: 1, ratio: 1 });

  await applyOtaUpdate();
  return { updated: true };
}

/** 读取 expo-updates 的日志，用于排查更新失败原因 */
export async function readOtaLogs(maxAgeMs = 60 * 60 * 1000) {
  if (!isOtaAvailable()) return [];
  try {
    return await Updates.readLogEntriesAsync(maxAgeMs);
  } catch {
    return [];
  }
}
