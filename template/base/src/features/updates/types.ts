/**
 * 更新模块类型定义
 *
 * 关键区分（最容易出线上事故的地方）：
 * - OTA（热更新）：只换 JS bundle 与资源，走 expo-updates。
 * - APK 更新：整个安装包，含原生代码，走下载 + 系统安装器。
 *
 * 判断依据是「运行时版本（runtimeVersion）」：
 * 原生代码变了 → 必须换 APK；只有 JS 变了 → 可以 OTA。
 */

/** 更新检查结果类型 */
export type UpdateKind = 'none' | 'ota' | 'apk' | 'both';

/** 服务端返回的版本信息 */
export interface IVersionInfo {
  /** 最新版本号，如 1.2.0 */
  version: string;
  /** Android versionCode，用于精确判断新旧 */
  versionCode?: number;
  /** 该版本对应的 runtimeVersion（与 app.json 的 runtimeVersion 对应） */
  runtimeVersion?: string;
  /** APK 下载地址（仅当原生变化时提供） */
  apkUrl?: string;
  /** APK 文件大小（字节），用于展示与校验 */
  apkSize?: number;
  /** APK 的 SHA-256，下载后校验完整性 */
  apkHash?: string;
  /** 更新说明 */
  releaseNotes?: string;
  /** 是否强制更新（强制时不可跳过） */
  forceUpdate?: boolean;
  /** 最低可运行版本，低于此版本必须强更 */
  minSupportedVersion?: string;
}

/** 更新检查的最终决策 */
export interface IUpdateDecision {
  kind: UpdateKind;
  /** 是否需要提示用户 */
  hasUpdate: boolean;
  /** 是否强制 */
  force: boolean;
  /** 当前本地版本 */
  currentVersion: string;
  /** 服务端最新版本 */
  latestVersion: string;
  /** OTA 是否可用 */
  otaAvailable: boolean;
  /** APK 是否可用 */
  apkAvailable: boolean;
  /** 版本信息原文 */
  info?: IVersionInfo;
}

/** APK 下载进度 */
export interface IDownloadProgress {
  /** 已下载字节 */
  downloaded: number;
  /** 总字节（未知时为 0） */
  total: number;
  /** 0 ~ 1，total 未知时为 0 */
  ratio: number;
}

/** 更新阶段（用于 UI 展示） */
export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'done'
  | 'error';
