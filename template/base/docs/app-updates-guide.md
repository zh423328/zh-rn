# 应用更新与热更新指南

本模板包含**两套更新机制**，必须分清，混淆是最常见的线上事故来源：

| | OTA 热更新 | APK 应用更新 |
| --- | --- | --- |
| 更新内容 | JS / 样式 / 图片资源 | 完整安装包（含原生代码） |
| 技术 | `expo-updates` | 下载 APK + 系统安装器 |
| 生效方式 | 重启 JS 运行时 | 覆盖安装 |
| 何时必须用 | 日常修 bug、改文案 | 改原生模块 / 权限 / SDK / 图标 |
| 代码位置 | `src/features/updates/ota.ts` | `src/features/updates/apk.ts` |

**判断依据是 `runtimeVersion`**：它变了说明原生代码变了，OTA 一定覆盖不到，必须走 APK。
`src/features/updates/version.ts` 的 `needsApkUpdate()` 已实现这个判断，并有单测覆盖。

---

## 一、客户端已实现的能力

- `checkForUpdates()` — 统一入口：先问服务端版本 → 判断 APK → 再判断 OTA
- `useUpdate()` — hook，串起「检查 → 下载 → 校验 → 安装」全流程
- `<UpdateDialog />` — 已挂载在根布局，支持进度、强制更新、失败引导
- 启动 1.5s 后自动静默检查一次，不阻塞首屏

### 手动触发

```tsx
import { useUpdate } from '@/features/updates/hooks';

function MyPage() {
  const { check, hasUpdate } = useUpdate();
  return <Button onPress={() => check()} title="检查更新" />;
}
```

---

## 二、服务端版本接口

客户端调用 `GET /app/version`，参数：`platform`、`version`、`versionCode`、`runtimeVersion`。

返回结构（`src/features/updates/types.ts` 的 `IVersionInfo`）：

```json
{
  "code": 0,
  "data": {
    "version": "1.2.0",
    "versionCode": 12,
    "runtimeVersion": "1.2.0",
    "apkUrl": "https://cdn.example.com/app-1.2.0.apk",
    "apkSize": 45678901,
    "apkHash": "sha256-...",
    "releaseNotes": "1. 修复登录问题\n2. 优化列表性能",
    "forceUpdate": false,
    "minSupportedVersion": "1.0.0"
  }
}
```

字段说明：

| 字段 | 必填 | 作用 |
| --- | --- | --- |
| `version` | ✅ | 语义化版本，回退比较用 |
| `versionCode` | 建议 | Android 单调递增，比版本号可靠 |
| `runtimeVersion` | 建议 | 与 app.json 对应，变了就必须换 APK |
| `apkUrl` / `apkSize` | 有 APK 时必须 | 下载地址与大小（用于校验） |
| `forceUpdate` | 否 | 强制更新，弹窗不可关闭 |
| `minSupportedVersion` | 否 | 低于此版本强制更新（后端不兼容旧版时用） |

---

## 三、OTA：自托管服务端（推荐用于国内）

`expo-updates` 的协议是开放的，客户端换个 `updates.url` 就能指向你自己的服务器。

### 3.1 协议要点

服务器需实现三个端点（[Expo Updates 协议规范](https://docs.expo.dev/technical-specs/expo-updates-1/)）：

```
GET  /manifest          # 返回 manifest JSON（含 bundle 地址与 hash）
GET  /assets/:hash      # 返回静态资源
```

manifest 关键字段：

```json
{
  "id": "更新唯一ID",
  "createdAt": "2026-10-22T00:00:00.000Z",
  "runtimeVersion": "1.0.0",
  "launchAsset": { "key": "bundle", "contentType": "application/javascript", "url": "https://..." },
  "assets": [],
  "metadata": {},
  "extra": {}
}
```

> 官方参考实现：[expo/custom-expo-updates-server](https://github.com/expo/custom-expo-updates-server)

### 3.2 客户端配置

`app.json` 里改 `updates.url`：

```json
{
  "expo": {
    "updates": {
      "url": "https://updates.your-domain.com/manifest",
      "fallbackToCacheTimeout": 0,
      "checkAutomatically": "NEVER"
    },
    "runtimeVersion": { "policy": "appVersion" }
  }
}
```

三个配置的作用：

- `checkAutomatically: "NEVER"` — 关掉原生启动检查，改由 JS 主动控制。
  这样避免「启动白屏等待」，也让你能决定何时重载。
- `fallbackToCacheTimeout: 0` — 启动不阻塞等更新。
- `runtimeVersion` — **必须与发布 OTA 时的值一致**，否则客户端拒绝加载。

### 3.3 发布流程

```bash
# 1. 导出 JS bundle 与资源
npx expo export --platform android --output-dir dist

# 2. 上传 dist 到你的 CDN/服务器（目录结构即协议要求的 assets 结构）

# 3. 更新服务器上的 manifest（指向新 bundle 的 URL 与 runtimeVersion）

# 4. 客户端下次检查时收到新 manifest → 下载 → 重启生效
```

> **关键约束**：OTA 只能更新 JS 与静态资源。改了原生依赖、权限、SDK，
> 必须重新构建 APK，并同步更新 `runtimeVersion`（`appVersion` 策略下即 `version`）。

### 3.4 切换到 EAS Update（如需）

不想自建服务器时，只改配置即可，客户端代码完全不用动：

```bash
npx eas update:configure   # 自动写入 projectId 到 updates.url
npx eas update --channel production -m "修复登录"
```

---

## 四、APK 应用更新

### 4.1 已实现的流程

```
检查版本 → 弹窗提示（含更新说明）→ 下载 APK（带真实进度）
→ 校验大小/哈希 → 调系统安装器 → 用户确认安装
```

代码：`src/features/updates/apk.ts`

### 4.2 必需配置

`app.json` 已加入：

```json
{ "expo": { "android": { "permissions": ["android.permission.REQUEST_INSTALL_PACKAGES"] } } }
```

没有这个权限，`IntentLauncher` 拉起安装器会被系统拒绝。

### 4.3 Android 8.0+ 的用户授权

即使用户装了你的 APK，**首次自更新仍需用户手动允许「安装未知来源应用」**。
这是系统强制行为，无法绕过。代码已做处理：

- 安装失败时弹出提示，引导跳转到对应的设置页
- `openUnknownSourcesSettings()` 会尝试跳 `MANAGE_UNKNOWN_APP_SOURCES`，
  失败则回退到应用详情页

> 实测提醒：部分国产 ROM（MIUI / EMUI / ColorOS）在自更新时会有额外弹窗
> 或需要「纯净模式」例外，建议在目标机型上实测。

### 4.4 签名一致性（最容易踩的坑）

**自更新的 APK 必须与原安装包使用同一签名**，否则系统会报「应用未安装」或「签名冲突」。

- EAS 构建：保持一致 keystore，不要重建
- 本地建构：固定同一个 keystore，切勿每次生成新密钥

### 4.5 iOS

iOS 系统不允许应用内自安装 APK 类的更新。
`installIosUpdate(appStoreUrl)` 只是跳转 App Store，实际更新仍由系统完成。

---

## 五、发布前检查清单

- [ ] `app.json` 的 `updates.url` 已改成真实地址（不是 `example.com` 占位）
- [ ] `android.package` / `ios.bundleIdentifier` 已改成真实包名
- [ ] APK 签名与历史版本一致
- [ ] 服务端 `/app/version` 返回结构与 `IVersionInfo` 对齐
- [ ] 测试 `runtimeVersion` 变化时确实走 APK 而非 OTA
- [ ] 强更场景验证：弹窗不可关闭、无法跳过
- [ ] 弱网 / 断网下下载失败的提示与重试
- [ ] 目标机型实测「安装未知来源应用」授权流程

---

## 六、常见问题

**Q: 为什么不用 CodePush？**
微软 App Center 已于 **2025-03-31 停服**，`react-native-code-push` 仓库已归档，
且不支持 New Architecture（RN 0.76+）。不要按网上旧教程接入。

**Q: OTA 更新后用户看到的是新代码吗？**
需要 `Updates.reloadAsync()` 才会生效。模板里由用户点击「立即重启更新」触发，
不会在用户操作中途强制重载。

**Q: 能否只发 OTA 不发 APK？**
可以，但仅限 JS / 样式 / 图片变化。一旦动了原生（加依赖、改权限、升 SDK），
必须发 APK，否则 OTA 包会因 `runtimeVersion` 不匹配被客户端拒绝。

**Q: 自托管服务器需要 HTTPS 吗？**
生产环境必须。HTTP 在 Android 9+ 默认被禁止（cleartext traffic）。
