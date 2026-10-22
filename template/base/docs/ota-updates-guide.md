# OTA 热更新发布指南（expo-updates）

模板内置的 OTA 能力基于 expo-updates，作用类似 uni-app 的 wgt 热更新：**不发商店版本，只下发 JS 层更新包**。原生代码（依赖原生模块的变更）仍需走 EAS Build / 商店发版。

## 一、前置配置（仅首次）

1. 安装 EAS CLI 并登录：

```bash
npm i -g eas-cli
eas login
```

2. 初始化项目（会自动把 `projectId` 写入 `app.json` 的 `updates.url`）：

```bash
eas update:configure
```

3. 确认 `app.json` 中存在：

```json
"updates": { "url": "https://u.expo.dev/<projectId>", "fallbackToCacheTimeout": 0 },
"runtimeVersion": { "policy": "appVersion" }
```

## 二、日常发布流程

```bash
# 1. 构建一个正式包（OTA 必须跑在正式构建上，Expo Go 无效）
eas build -p android --profile preview

# 2. 修改 JS 代码后，发布热更新
eas update --branch production -m "修复xx问题"
```

客户端行为（模板已内置，见 `src/utils/updates.ts`）：

- 调用 `checkForOtaUpdate()` 检查更新（建议在进入首页或 `useEffect` 中调用）
- 有更新 → 下载 → `reloadAsync()` 重载进入新版本
- 无更新 / 失败 → 静默或提示

## 三、版本匹配规则（runtimeVersion）

`"policy": "appVersion"` 表示：OTA 包只能作用于 **相同 appVersion** 的构建。

- 升级了原生依赖 / 改了 `appVersion` → 必须重新 `eas build`
- 只改了 JS/TS 代码 → 直接 `eas update` 即可

## 四、回滚

```bash
# 查看发布历史
eas update:list --branch production

# 回滚到某个组（在 Expo 控制台 https://expo.dev 上操作更直观）
```

## 五、注意事项

1. **Expo Go 中无效**：`Updates.isEnabled` 为 false 时 `checkForOtaUpdate()` 会直接跳过（模板已处理）
2. **商店合规**：iOS 允许 OTA 更新 JS 层，但不得显著改变 App 用途
3. **频控**：`fallbackToCacheTimeout: 0` 表示启动不阻塞等待更新，由代码主动检查，避免白屏
