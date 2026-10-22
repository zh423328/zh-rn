/**
 * 版本号比较与更新决策的纯函数
 *
 * 抽成纯函数的原因：
 * 1. 版本比较是最容易写错、也最容易导致「永远提示更新」或「永远不更新」的地方。
 * 2. 纯函数可以直接单测，不需要模拟原生模块。
 */

/**
 * 解析语义化版本号为数字数组
 * 支持 "1.2.3"、"1.2.3-beta.1"、"v1.2.3" 形式。
 * 预发布标识（-beta 等）在比较时被忽略，只比较主版本。
 */
export function parseVersion(version: string): number[] {
  const cleaned = String(version ?? '')
    .trim()
    .replace(/^v/i, '')
    // 去掉预发布/构建元数据
    .split(/[-+]/)[0];

  return cleaned.split('.').map((part) => {
    const num = Number.parseInt(part, 10);
    return Number.isFinite(num) ? num : 0;
  });
}

/**
 * 比较两个版本号
 * @returns 1 表示 a > b，-1 表示 a < b，0 表示相等
 */
export function compareVersion(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  const len = Math.max(va.length, vb.length);

  for (let i = 0; i < len; i += 1) {
    const na = va[i] ?? 0;
    const nb = vb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/** a 是否比 b 新 */
export function isNewerVersion(a: string, b: string): boolean {
  return compareVersion(a, b) > 0;
}

/**
 * 判断是否需要走 APK 更新
 *
 * 逻辑优先级（重要，别调整）：
 * 1. versionCode 可用时以它为准 —— 它单调递增，不受版本号命名影响。
 * 2. 否则回退到语义化版本比较。
 * 3. runtimeVersion 不同 → 原生已变，必须换 APK，OTA 无法覆盖。
 */
export function needsApkUpdate(params: {
  currentVersion: string;
  currentVersionCode?: number;
  currentRuntimeVersion?: string;
  info: {
    version: string;
    versionCode?: number;
    runtimeVersion?: string;
  };
}): boolean {
  const { currentVersion, currentVersionCode, currentRuntimeVersion, info } = params;

  // 原生代码变了：OTA 一定覆盖不到
  if (
    info.runtimeVersion &&
    currentRuntimeVersion &&
    info.runtimeVersion !== currentRuntimeVersion
  ) {
    return true;
  }

  // versionCode 优先
  if (
    typeof info.versionCode === 'number' &&
    typeof currentVersionCode === 'number' &&
    info.versionCode > currentVersionCode
  ) {
    return true;
  }

  return isNewerVersion(info.version, currentVersion);
}

/**
 * 判断是否强制更新
 *
 * 三种强制场景：
 * 1. 服务端显式标 forceUpdate
 * 2. 当前版本低于最低支持版本（后端已不兼容）
 * 3. 原生版本落后且没有 OTA 通道
 */
export function isForceUpdate(params: {
  currentVersion: string;
  forceUpdate?: boolean;
  minSupportedVersion?: string;
}): boolean {
  const { currentVersion, forceUpdate, minSupportedVersion } = params;

  if (forceUpdate) return true;

  if (minSupportedVersion && compareVersion(currentVersion, minSupportedVersion) < 0) {
    return true;
  }

  return false;
}

/** 格式化为可读大小 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
