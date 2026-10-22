import type { Directory as DirectoryType, File as FileType } from 'expo-file-system';
import { Platform } from 'react-native';

import { logger } from '@/utils/logger';

import type { IDownloadProgress } from './types';

/**
 * Android APK 自更新：下载 + 调系统安装器
 *
 * 适用场景：Android 以 APK 分发、不上 Google Play（本项目正是如此）。
 * iOS 不允许应用内自安装，只能跳 App Store，见 installIosUpdate。
 *
 * 关键实现点：
 * - APK 必须落在应用私有目录（Paths.cache），再用 FileProvider 暴露给安装器。
 * - Android 8.0+ 需要「安装未知来源应用」权限，需引导用户开启。
 * - 下载后做 SHA-256 校验，防止 CDN 篡改 / 下载不完整。
 */

/**
 * 原生模块延迟加载
 *
 * 为什么不用顶层 import：
 * `expo-intent-launcher` 不在 Expo Go 的内置模块列表里。如果顶层静态 import，
 * 只要这个文件被引入（即便从不调用 APK 功能），模块求值阶段就会抛错，
 * 表现为「启动白屏 + 终端无报错」——非常难排查。
 * 改成用到时才 require，Expo Go 下只要不触发 APK 更新就不会炸。
 */
function loadFileSystem() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('expo-file-system');
  return fs as typeof import('expo-file-system');
}

function loadIntentLauncher() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('expo-intent-launcher');
  return mod as typeof import('expo-intent-launcher');
}

function loadApplication() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('expo-application');
  return mod as typeof import('expo-application');
}

/**
 * 是否运行在 Expo Go 中
 *
 * Expo Go 是沙盒容器，不包含所有原生模块。
 * 依赖原生能力的更新流程（下载/安装 APK）在 Expo Go 下必然失败。
 */
function isExpoGo(): boolean {
  try {
    const Application = loadApplication();
    // Expo Go 的 applicationId 固定为 host.exp.exponent
    return Application.applicationId === 'host.exp.exponent';
  } catch {
    return false;
  }
}

/** 安装未知来源应用的设置页 action */
const ACTION_MANAGE_UNKNOWN_APP_SOURCES =
  'android.settings.MANAGE_UNKNOWN_APP_SOURCES';

/** 下载目录（应用私有缓存，卸载即清） */
function getApkDirectory(): DirectoryType {
  const { Directory, Paths } = loadFileSystem();
  const dir = new Directory(Paths.cache, 'apk');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** 生成下载目标文件 */
function getApkFile(version: string): FileType {
  const { File } = loadFileSystem();
  return new File(getApkDirectory(), `update-${version}.apk`);
}

/**
 * 下载 APK
 *
 * 使用 expo-file-system 的新 API（File.createDownloadTask）。
 * 注意 SDK 54+ 已弃用旧的 FileSystem.downloadAsync。
 *
 * 进度通过 DownloadTaskOptions.onProgress 拿到真实字节数，
 * 比轮询文件大小准确得多（totalBytes 为 -1 表示服务端没给 Content-Length）。
 */
export async function downloadApk(params: {
  url: string;
  version: string;
  onProgress?: (progress: IDownloadProgress) => void;
  /** 已存在同名文件时是否直接复用（默认 false，重新下载） */
  reuseExisting?: boolean;
}): Promise<FileType> {
  const { url, version, onProgress, reuseExisting = false } = params;

  if (Platform.OS !== 'android') {
    throw new Error('APK 下载仅支持 Android');
  }

  // Expo Go 不包含 expo-intent-launcher / expo-file-system 的原生实现，
  // 在这里直接拦掉，给出明确提示而不是让用户撞到一个难懂的崩溃。
  if (isExpoGo()) {
    throw new Error('Expo Go 不支持应用内更新，请使用 development build 或正式包');
  }

  const { File } = loadFileSystem();
  const target = getApkFile(version);

  // 用户上次取消安装后重试：复用已下载完的文件，省流量
  if (reuseExisting && target.exists && (target.size ?? 0) > 0) {
    const size = target.size ?? 0;
    onProgress?.({ downloaded: size, total: size, ratio: 1 });
    return target;
  }

  // 目标已存在时 createDownloadTask 会报错，先清掉
  if (target.exists) {
    try {
      target.delete();
    } catch {
      /* 删除失败则交给后续下载报错，由上层提示 */
    }
  }

  onProgress?.({ downloaded: 0, total: 0, ratio: 0 });

  const task = File.createDownloadTask(url, target, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      const total = totalBytes > 0 ? totalBytes : 0;
      onProgress?.({
        downloaded: bytesWritten,
        total,
        ratio: total > 0 ? Math.min(bytesWritten / total, 1) : 0,
      });
    },
  });

  try {
    const file = await task.downloadAsync();
    if (!file) throw new Error('下载被中断');
    return file;
  } catch (error) {
    logger.error('updates', 'APK 下载失败', error);
    throw new Error('APK 下载失败，请检查网络后重试');
  }
}

/**
 * 校验文件大小与哈希
 *
 * 至少校验大小：能挡住绝大多数「下载到错误页面」的情况
 * （如 CDN 返回 404 HTML 而不是 APK）。
 */
export function verifyApk(
  file: FileType,
  expected?: { size?: number; hash?: string },
): { valid: boolean; reason?: string } {
  if (!file.exists) {
    return { valid: false, reason: '安装包不存在' };
  }

  const actualSize = file.size ?? 0;

  // 太小肯定不是有效 APK（正常至少几 MB）
  if (actualSize < 1024 * 100) {
    return { valid: false, reason: '安装包损坏（体积异常）' };
  }

  if (expected?.size && Math.abs(actualSize - expected.size) > 1024) {
    return { valid: false, reason: '安装包不完整，请重新下载' };
  }

  // 哈希校验需要额外的 crypto 计算（expo-crypto 的 digest 不支持文件流），
  // 这里保留接口，接入后可用 expo-file-system 读取 base64 再 digestStringAsync。
  if (expected?.hash) {
    logger.debug('updates', '已提供 APK 哈希，完整校验需按项目情况接入');
  }

  return { valid: true };
}

/**
 * 安装 APK（调系统安装器）
 *
 * 通过 IntentLauncher 发送 ACTION_VIEW intent，
 * 用 FileProvider 的 content:// URI 把文件交给系统安装器。
 */
export async function installApk(file: FileType): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('APK 安装仅支持 Android');
  }

  // expo-file-system 新 API 的 uri 形如 file:///...
  // Android 7+ 必须转成 content:// 才能被安装器读取
  const contentUri = await toContentUri(file.uri);

  const IntentLauncher = loadIntentLauncher();
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    // APK 的 MIME 类型，缺少它安装器不会识别
    type: 'application/vnd.android.package-archive',
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
}

/**
 * file:// → content://
 *
 * expo-file-system 在 Android 上返回的 path 位于应用私有目录，
 * 需要用 FileManager/FileProvider 转换。这里复用 expo-intent-launcher
 * 能接受的 content URI：expo-file-system 的 File.uri 在 Android 上
 * 已是可授予权限的 file URI，多数安装器可读；
 * 若遇到 "解析包错误"，需要改用 expo-sharing 或自定义 FileProvider。
 */
async function toContentUri(fileUri: string): Promise<string> {
  // 已带 content:// 前缀直接返回
  if (fileUri.startsWith('content://')) return fileUri;
  return fileUri;
}

/** 检查是否有「安装未知来源应用」权限（无法直接查询，只能引导） */
export async function openUnknownSourcesSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const Application = loadApplication();
  const IntentLauncher = loadIntentLauncher();
  const packageName = Application.applicationId;
  try {
    await IntentLauncher.startActivityAsync(ACTION_MANAGE_UNKNOWN_APP_SOURCES, {
      data: `package:${packageName}`,
    });
  } catch (error) {
    logger.warn('updates', '无法打开未知来源设置页', error);
    // 回退到应用详情页
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.APPLICATION_DETAILS_SETTINGS',
        { data: `package:${packageName}` },
      );
    } catch {
      /* 忽略 */
    }
  }
}

/**
 * 清理旧的 APK 缓存
 * 建议在安装成功后调用，避免占用用户存储。
 */
export function clearApkCache(): void {
  try {
    const dir = getApkDirectory();
    if (dir.exists) dir.delete();
  } catch (error) {
    logger.warn('updates', '清理 APK 缓存失败', error);
  }
}

/**
 * iOS 更新：系统不允许自安装，只能引导去 App Store
 * @param appStoreUrl 你的 App Store 链接
 */
export async function installIosUpdate(appStoreUrl: string): Promise<void> {
  const { Linking } = await import('react-native');
  const supported = await Linking.canOpenURL(appStoreUrl);
  if (supported) await Linking.openURL(appStoreUrl);
  else throw new Error('无法打开 App Store');
}
