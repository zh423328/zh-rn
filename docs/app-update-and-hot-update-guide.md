# React Native 应用更新完全指南：APK 自更新与 OTA 热更新

> 面向 Expo SDK 57 / RN 0.86 项目，Android 以 APK 分发（不上 Google Play）的场景。
> 文中所有代码均来自 `@zayn919/create-zh-rn` 脚手架 `src/features/updates/` 的实际实现。

## 前言：先搞清楚你要更新的是什么

很多人一说「热更新」就想到 CodePush，然后发现它已经停服了。但在谈方案之前，有个更根本的问题需要先回答：

**你到底要更新什么？**

React Native 的更新分为两类，它们的边界由「原生代码有没有变」划分：

| | OTA 热更新 | APK 应用更新 |
| --- | --- | --- |
| 更新内容 | JS 代码、样式、图片资源 | 完整安装包，含原生二进制 |
| 技术手段 | `expo-updates` 下载 JS bundle | 下载 APK + 调系统安装器 |
| 生效方式 | 重启 JS 运行时 | 覆盖安装 |
| 用户感知 | 几乎无感 | 需要用户确认安装 |
| 审核 | 不经过应用商店 | 需要重新签名分发 |

分界线是：**你能不能只换 JS 就跑起来**。

- 改了个按钮文案、修了接口报错、调了样式 → 换 JS 就行 → **OTA**
- 加了 `expo-camera`、改了权限声明、升级了 SDK → 原生变了 → **必须换 APK**

这条线画错，就是线上事故的开始。我见过把图标改动用 OTA 发出去，结果用户端毫无反应，排查半天才发现——图标是打进 APK 的资源，根本不在 JS 的更新范围内。

## 一、选型：2026 年的现实

先说一个绕不开的事实：**CodePush 已经死了**。

微软 App Center 于 **2025 年 3 月 31 日**正式停服，`react-native-code-push` 官方仓库已经归档。更致命的是它**不支持 New Architecture**——RN 0.76+ 项目要用它，得先关掉新架构。对于一个 2026 年启动的项目，这条路直接堵死。

网上大量 CodePush 教程现在都是坑，尤其是那些让你去 `appcenter.ms` 注册应用的，那个站点已经不提供服务了。

当前可选项：

| 方案 | 状态 | 适用场景 |
| --- | --- | --- |
| **expo-updates + EAS Update** | ✅ 官方维护 | 能接受海外服务、预算充足 |
| **expo-updates + 自托管** | ✅ 官方协议开放 | 国内分发、要求可控 |
| hot-updater / Stallion / Revopush | ⚠️ 第三方 | 需自行评估成熟度 |
| react-native-code-push | ❌ 停服 | 不要用于新项目 |

**关键认知**：`expo-updates` 是一个**客户端 SDK**，它和服务器之间的协议是公开的。这意味着你可以：

- 指向 Expo 官方的 `https://u.expo.dev/<projectId>`
- 或者指向你自己实现的服务器 `https://updates.your-domain.com/manifest`

客户端代码**一个字都不用改**，只换 `app.json` 里的 URL。

本文以自托管为主，因为国内访问 Expo 云的稳定性不理想，而且更新是核心链路，一旦国外服务抖动就可能影响用户打开 App。

## 二、理解 runtimeVersion：整个体系的枢纽

如果只能记住一个概念，那就是 `runtimeVersion`。

它的作用是：**标记一次构建的原生环境指纹**。只有 `runtimeVersion` 完全匹配的 OTA 包，才能被客户端接受。

为什么需要它？因为 OTA 只换 JS。如果你发了新 APK 加了原生模块，然后想把 JS 推给旧 APK 用户——旧 APK 里根本没有那个原生模块，JS 一跑就崩。`runtimeVersion` 就是那道拦截线。

配置策略有三种：

```json
// 1. appVersion：跟 version 走（推荐，最直观）
{ "runtimeVersion": { "policy": "appVersion" } }

// 2. nativeVersion：跟 version + buildNumber/versionCode 走
{ "runtimeVersion": { "policy": "nativeVersion" } }

// 3. fingerprint：自动计算原生指纹（最严谨，SDK 50+）
{ "runtimeVersion": { "policy": "fingerprint" } }
```

我们选 `appVersion`。规则很简单：

- 只改 JS → `version` 不动 → OTA 可以推
- 改了原生 → `version` 必须 +1 → 重新构建 APK，旧版本的 OTA 自动失效

本项目 `app.json` 的实际配置：

```json
{
  "expo": {
    "version": "1.0.0",
    "updates": {
      "url": "https://updates.example.com/api/manifest",
      "fallbackToCacheTimeout": 0,
      "checkAutomatically": "NEVER"
    },
    "runtimeVersion": { "policy": "appVersion" },
    "android": {
      "permissions": ["android.permission.REQUEST_INSTALL_PACKAGES"]
    }
  }
}
```

三个 updates 配置项各自的作用，值得单独说明：

| 配置 | 值 | 为什么这么选 |
| --- | --- | --- |
| `url` | 自托管地址 | 换成 EAS 只需改这里 |
| `fallbackToCacheTimeout` | `0` | 启动时不阻塞等待更新，避免白屏 |
| `checkAutomatically` | `NEVER` | **关掉原生自动检查**，改由 JS 主动控制 |

最后一项是关键决策。默认值 `ON_LOAD` 会在启动时检查并下载更新，然后**在下次启动时**应用。这带来两个问题：一是启动可能变慢，二是你完全失去对「何时重载」的控制权。

设成 `NEVER` 后，检查、下载、重载全部由我们的代码决定，UI 体验更可控。

## 三、统一更新入口：一次检查，两套通道

现在的核心问题是：**怎么判断该走哪条路？**

答案在 `src/features/updates/version.ts` 里。判断逻辑按优先级排列：

```ts
export function needsApkUpdate(params: {
  currentVersion: string;
  currentVersionCode?: number;
  currentRuntimeVersion?: string;
  info: { version: string; versionCode?: number; runtimeVersion?: string };
}): boolean {
  const { currentVersion, currentVersionCode, currentRuntimeVersion, info } = params;

  // 第一优先：原生代码变了，OTA 一定覆盖不到
  if (
    info.runtimeVersion &&
    currentRuntimeVersion &&
    info.runtimeVersion !== currentRuntimeVersion
  ) {
    return true;
  }

  // 第二优先：versionCode 单调递增，比版本号可靠
  if (
    typeof info.versionCode === 'number' &&
    typeof currentVersionCode === 'number' &&
    info.versionCode > currentVersionCode
  ) {
    return true;
  }

  // 兜底：语义化版本比较
  return isNewerVersion(info.version, currentVersion);
}
```

为什么 `versionCode` 要排在版本号前面？

因为版本号是人写的字符串，可能出现 `1.10.0` 和 `1.9.0` 这种陷阱——字符串比较会认为 `1.10.0 < 1.9.0`。而 `versionCode` 是整数，永远单调递增，不会有歧义。

顺带说下 `parseVersion` 的实现，它把版本拆成数字数组再逐位比较，规避了上面那个坑：

```ts
export function compareVersion(a: string, b: string): number {
  const va = parseVersion(a);  // "1.10.0" → [1, 10, 0]
  const vb = parseVersion(b);  // "1.9.0"  → [1, 9, 0]
  const len = Math.max(va.length, vb.length);

  for (let i = 0; i < len; i += 1) {
    const na = va[i] ?? 0;
    const nb = vb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}
```

这段逻辑有专门的单测覆盖，包括 `1.10.0 > 1.9.0`、`versionCode` 优先、不降级等边界。

### 主流程

`api.ts` 的 `checkForUpdates()` 是全流程入口。决策顺序是：

```
1. 问服务端：最新版本是什么？
2. 判断是否需要换 APK（原生变了 / 版本更新）
3. 如果不需要 APK，再检查 OTA 有没有新 JS
```

**APK 优先级高于 OTA** 是刻意的。因为如果原生已经不兼容，OTA 包即使下载下来也可能跑不起来，白费用户流量。

```ts
export async function checkForUpdates(): Promise<IUpdateDecision> {
  const local = getLocalVersionInfo();

  const decision: IUpdateDecision = {
    kind: 'none', hasUpdate: false, force: false,
    currentVersion: local.version, latestVersion: local.version,
    otaAvailable: false, apkAvailable: false,
  };

  // ---- 1. 服务端版本信息 ----
  let info: IVersionInfo | undefined;
  try {
    info = await fetchVersionInfo();
    decision.info = info;
    decision.latestVersion = info.version;
  } catch (error) {
    // 后端不可用不该阻断 App 使用，退化为只检查 OTA
    logger.warn('updates', '版本接口不可用，仅检查 OTA', error);
  }

  // ---- 2. APK 判断 ----
  if (info) {
    const apkNeeded = needsApkUpdate({ /* ... */ });
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
      decision.force = false;  // OTA 一般不强制，避免打断用户
    }
  }

  return decision;
}
```

注意第 1 步的容错：**版本接口挂了不能阻断 App 启动**。这是个易被忽略的细节——如果版本服务是独立的，它挂了不应该让整个应用不可用。

## 四、OTA 热更新实战

### 4.1 客户端逻辑

`ota.ts` 里有三个原子操作，刻意拆开：

```ts
// 只检查，不下载
export async function checkOtaUpdate(): Promise<boolean> { /* ... */ }

// 只下载，不重启
export async function downloadOtaUpdate(): Promise<boolean> { /* ... */ }

// 重启生效
export async function applyOtaUpdate(): Promise<void> {
  await Updates.reloadAsync();
}
```

为什么要拆开？因为**「下载完成立刻 reload」是很差的体验**。想象用户正在填表单，突然 App 一闪重启，输入全没了。

正确做法是：后台静默下载，等到合适的时机（比如用户回到首页、或下次冷启动）再提示重启。

```ts
export async function runOtaUpdateFlow(
  onProgress?: (progress: IDownloadProgress) => void,
): Promise<{ updated: boolean; reason?: string }> {
  if (!isOtaAvailable()) {
    return { updated: false, reason: '当前环境不支持 OTA（需正式构建）' };
  }

  const available = await checkOtaUpdate();
  if (!available) return { updated: false, reason: '已是最新版本' };

  const downloaded = await downloadOtaUpdate();
  if (!downloaded) return { updated: false, reason: '下载失败，请稍后重试' };

  await applyOtaUpdate();
  return { updated: true };
}
```

还有个容易踩的坑：`Updates.isEnabled` 在**开发模式和 Expo Go 中都是 false**。所以本地调试时 OTA 永远不工作，必须用 development build 或正式包验证。代码里已经做了这层判断：

```ts
export function isOtaAvailable(): boolean {
  return !__DEV__ && Updates.isEnabled;
}
```

### 4.2 自托管服务端要做什么

`expo-updates` 的服务端只需要实现**一个 manifest 端点**（资源文件走 CDN 即可）：

```
GET /manifest?platform=android&runtimeVersion=1.0.0
```

服务端需要响应两个必需头部，缺了客户端会直接报错：

| 响应头 | 值 |
| --- | --- |
| `content-type` | `application/expo+json` 或 `application/json` |
| `expo-protocol-version` | `1` |

返回的 manifest body（[官方规范](https://docs.expo.dev/technical-specs/expo-updates-1/)）：

```json
{
  "id": "8f3a1c2d-...",
  "createdAt": "2026-10-22T00:00:00.000Z",
  "runtimeVersion": "1.0.0",
  "launchAsset": {
    "key": "bundle",
    "contentType": "application/javascript",
    "url": "https://cdn.example.com/bundles/v3/android.bundle",
    "hash": "sha256-base64url-..."
  },
  "assets": []
}
```

客户端拿到 manifest 后：

1. 先比对 `runtimeVersion`，不匹配直接拒绝（这是安全闸门）
2. 再比对 `id`，与当前运行的不同才下载 `launchAsset` 与 `assets`
3. 每个 asset 下载后要校验 `hash`（base64url 编码的 SHA-256）

**几个容易忽略的服务端要求**：

- `cache-control` 要设短（推荐 `private, max-age=0`），否则 CDN 缓存会导致用户拿到旧 manifest
- 没有更新时应返回 HTTP `204`（无内容），或 `406`（JSON 格式下不适用）
- 响应也支持 `multipart/mixed` 格式（可携带签名等扩展），简单场景用 JSON 即可

官方有个可直接跑的参考实现：[expo/custom-expo-updates-server](https://github.com/expo/custom-expo-updates-server)。

### 4.3 发布流程

```bash
# 1. 导出 bundle 与资源
npx expo export --platform android --output-dir dist

# 2. 上传 dist 到你的 CDN
# 目录结构本身就是协议要求的 assets 结构

# 3. 更新服务器上的 manifest，指向新 bundle

# 4. 客户端下次检查时收到新 manifest → 下载 → 重启生效
```

**一个必须强调的约束**：改了原生依赖、权限、SDK，OTA 是发不出去的。这时候必须重新构建 APK，并把 `version` +1（`appVersion` 策略下 `runtimeVersion` 会跟着变，旧版 OTA 自动失效）。

## 五、APK 自更新实战

这部分是 Android 不上架商店时的刚需——没有应用商店帮你分发，用户怎么拿到新版本？

### 5.1 完整流程

```
检查版本 → 弹窗提示 → 下载 APK（带真实进度）
→ 校验大小/哈希 → 调系统安装器 → 用户确认安装
```

### 5.2 下载：用对 API

`expo-file-system` 在 SDK 54+ 换了全新 API。网上大量教程还在用 `FileSystem.downloadAsync`，那个已经弃用，现在要用 `File` / `Directory` / `Paths`。

```ts
import { Directory, File, Paths } from 'expo-file-system';

function getApkDirectory(): Directory {
  const dir = new Directory(Paths.cache, 'apk');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export async function downloadApk(params: {
  url: string;
  version: string;
  onProgress?: (progress: IDownloadProgress) => void;
}): Promise<File> {
  const { url, version, onProgress } = params;
  const target = new File(getApkDirectory(), `update-${version}.apk`);

  if (target.exists) {
    try { target.delete(); } catch { /* 交给后续报错 */ }
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

  const file = await task.downloadAsync();
  if (!file) throw new Error('下载被中断');
  return file;
}
```

这里有个细节值得说：`onProgress` 是 `DownloadTaskOptions` 提供的**真实字节回调**。不少教程通过定时轮询文件大小来算进度，那既不准又费性能。另外 `totalBytes` 为 `-1` 表示服务端没返回 `Content-Length`，代码里已经处理了这种情况（`total` 归零而不是算出负数）。

### 5.3 校验：别省这一步

下载完成后必须校验。最典型的失败场景是：CDN 配错，返回了一个 404 HTML 页面，但状态码是 200，文件顺利"下载"完成——然后安装器报"解析包错误"，用户一脸懵。

```ts
export function verifyApk(
  file: File,
  expected?: { size?: number; hash?: string },
): { valid: boolean; reason?: string } {
  if (!file.exists) return { valid: false, reason: '安装包不存在' };

  const actualSize = file.size ?? 0;

  // 太小肯定不是有效 APK（正常至少几 MB）
  if (actualSize < 1024 * 100) {
    return { valid: false, reason: '安装包损坏（体积异常）' };
  }

  // 允许少量误差，但差异过大说明下载不完整
  if (expected?.size && Math.abs(actualSize - expected.size) > 1024) {
    return { valid: false, reason: '安装包不完整，请重新下载' };
  }

  return { valid: true };
}
```

### 5.4 安装：Intent + 权限

安装 APK 本质是发一个 `ACTION_VIEW` intent 给系统：

```ts
import * as IntentLauncher from 'expo-intent-launcher';

export async function installApk(file: File): Promise<void> {
  if (Platform.OS !== 'android') throw new Error('APK 安装仅支持 Android');

  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: file.uri,
    type: 'application/vnd.android.package-archive',  // 缺了它安装器不认
    flags: 1,  // FLAG_GRANT_READ_URI_PERMISSION
  });
}
```

`app.json` 必须声明权限，否则系统直接拒绝：

```json
{ "expo": { "android": { "permissions": ["android.permission.REQUEST_INSTALL_PACKAGES"] } } }
```

### 5.5 三个必踩的坑

**坑一：安装未知来源应用的授权**

Android 8.0+ 即使用户已经装了你的 APK，**首次自更新仍需手动允许"安装未知来源应用"**。这是系统强制行为，无法绕过。

代码里的处理是：安装失败时弹提示，引导用户去设置页。

```ts
export async function openUnknownSourcesSettings(): Promise<void> {
  const packageName = Application.applicationId;
  try {
    await IntentLauncher.startActivityAsync(
      'android.settings.MANAGE_UNKNOWN_APP_SOURCES',
      { data: `package:${packageName}` },
    );
  } catch {
    // 回退到应用详情页
    await IntentLauncher.startActivityAsync(
      'android.settings.APPLICATION_DETAILS_SETTINGS',
      { data: `package:${packageName}` },
    );
  }
}
```

> 实测提醒：MIUI / EMUI / ColorOS 等国产 ROM 可能有额外弹窗，甚至需要关掉"纯净模式"，建议在目标机型上逐个验证。

**坑二：签名必须一致**

自更新的 APK 必须与原安装包**同一签名**，否则系统报"应用未安装"或"签名冲突"。

- EAS 构建：始终用同一个 keystore，不要重建
- 本地构建：固定同一个 keystore 文件，切勿每次生成新密钥

这是自更新最常见的失败原因，而且报错信息很不友好，容易误判成代码问题。

**坑三：`content://` vs `file://`**

Android 7+ 的安装器需要 `content://` URI。`expo-file-system` 返回的是 `file://` 形式。多数情况下安装器能读，但部分机型会报"解析包错误"。

如果遇到这个问题，需要改用 `expo-sharing` 或者配置自定义 `FileProvider`。代码里保留了转换函数的接口，可按实际情况接入。

### 5.6 iOS 说明

iOS 系统**不允许应用内自安装**。`installIosUpdate()` 只能跳转 App Store，实际更新仍由系统完成。所以 iOS 的更新能力上限就是「引导用户去商店」。

## 六、强制更新与体验设计

什么时候该强制？

```ts
export function isForceUpdate(params: {
  currentVersion: string;
  forceUpdate?: boolean;
  minSupportedVersion?: string;
}): boolean {
  const { currentVersion, forceUpdate, minSupportedVersion } = params;

  // 1. 服务端显式标记
  if (forceUpdate) return true;

  // 2. 低于最低支持版本（后端已不兼容旧版）
  if (minSupportedVersion && compareVersion(currentVersion, minSupportedVersion) < 0) {
    return true;
  }

  return false;
}
```

第 2 条最容易被忽略但很重要：**当后端 API 发生不兼容变更时**，旧版客户端会各种报错。这时候必须强制更新，而不是让用户在一个坏掉的 App 里挣扎。

对应的弹窗设计（`UpdateDialog.tsx`）：

- 强更时**不显示"稍后"按钮**，且屏蔽系统返回键
- 下载中禁用所有按钮，防止重复触发
- APK 显示"立即更新"，OTA 显示"立即重启更新"——用词区分，避免用户误解

## 七、发布前检查清单

这份清单建议直接贴进你的 PR 模板：

- [ ] `app.json` 的 `updates.url` 是真实地址（不是 `example.com` 占位）
- [ ] `android.package` / `ios.bundleIdentifier` 是真实包名
- [ ] APK 签名与历史版本一致
- [ ] 服务端 `/app/version` 返回结构与客户端类型对齐
- [ ] 验证 `runtimeVersion` 变化时确实走 APK 而非 OTA
- [ ] 强更场景：弹窗不可关闭、无法跳过
- [ ] 弱网 / 断网下的下载失败提示与重试
- [ ] 目标机型实测「安装未知来源应用」授权流程
- [ ] OTA 只在 release 构建验证（dev / Expo Go 下 `isEnabled` 为 false）

## 八、几个常见疑问

**Q：能不能只用 OTA，永远不发 APK？**

不能。只要动了原生就得发 APK。而且 OTA 包本身也依赖 `runtimeVersion` 匹配，客户端不会接受不匹配的包。

**Q：OTA 更新后用户看到的是新代码吗？**

需要调用 `Updates.reloadAsync()` 才生效。本文的实现在用户点击「立即重启更新」时才触发，不会在操作中途强制重载。

**Q：自托管服务器必须 HTTPS 吗？**

生产环境必须。Android 9+ 默认禁止明文流量，HTTP 请求会被直接拦截。

**Q：服务端版本接口挂了会怎样？**

不影响 App 使用。代码里做了容错——版本接口失败会退化成「只检查 OTA」，不会阻断启动。

**Q：为什么不用 CodePush？**

前面说过：2025-03-31 停服、仓库归档、不支持 New Architecture。这不是「不推荐」，是「不能用」。

## 九、小结

把整个体系压缩成一张图：

```
用户启动 App
    │
    ├─ 静默检查（启动 1.5s 后）
    │
    ├─ GET /app/version  ── 失败 ──→ 降级：只查 OTA
    │
    ├─ runtimeVersion 变了？── 是 ──→ 走 APK 通道（下载 + 安装）
    │
    ├─ versionCode/version 更新？── 是 ──→ 走 APK 通道
    │
    └─ 以上都没有 ──→ 查 OTA ── 有新版 ──→ 下载 → 等时机重启
```

三条原则：**分清 JS 与原生、用 runtimeVersion 做闸门、更新失败不能阻断 App 使用**。

代码实现见脚手架 `src/features/updates/`，配套文档 `docs/app-updates-guide.md` 里有服务端协议细节和发布流程。
