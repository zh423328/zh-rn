# zh-rn-app

符合中文开发习惯的 React Native 企业级项目模板（由 `@zayn919/create-zh-rn` 生成）。

Expo SDK 57 · RN 0.86 · Expo Router v57 · NativeWind v5（Tailwind v4）· TanStack Query v5 · Zustand v5 · TypeScript strict

## 快速开始

```bash
pnpm i          # 或 npm i
pnpm start      # 启动 Metro（按 i / a 打开模拟器，或用 development build 扫码）
```

> 模板自带 `.npmrc`，默认使用国内镜像 `registry.npmmirror.com` 加速安装
> （实测 npm 安装从约 3 分钟降到约 1 分钟）。如需安装私有包或发布，
> 临时覆盖源即可：`npm install <pkg> --registry=https://registry.npmjs.org`。

> 模板锁定 `lightningcss@1.30.1`（npm 用 package.json overrides；pnpm 用 pnpm-workspace.yaml overrides）。不锁这个版本，
> NativeWind v5 的原生打包会出现 `failed to deserialize; expected an object-like struct named Specifier`。
> 详见下方「已知约束」。

## 内置能力

| 能力 | 位置 | 说明 |
| --- | --- | --- |
| 文件路由 | `app/` | `(auth)` 未登录 / `(main)` 主业务 / `modal` 模态，typedRoutes 类型安全 |
| 服务端数据 | `src/features/*/hooks.ts` | TanStack Query：缓存、失效、重试策略由 `src/lib/query-client.ts` 统一管理 |
| HTTP | `src/api/client.ts` | Axios：注入 token / 设备标识，统一映射 AppError，401 single-flight 刷新 |
| 登录态 | `src/lib/token-store.ts` | token 存 **expo-secure-store**（不是 AsyncStorage），并发刷新只触发一次 |
| 用户信息 | `src/features/auth/store.ts` | Zustand + persist（AsyncStorage，非敏感数据） |
| 设备标识 | `src/lib/device-install-id.ts` | 安装级 UUID（expo-crypto），经 `X-Install-Id` 上报 |
| 实时消息 | `src/features/notifications/ws-client.ts` | WebSocket：指数退避重连、心跳、前后台切换、订阅恢复 |
| 错误处理 | `src/components/AppErrorBoundary.tsx` | 渲染异常兜底 + 三态 UI（Loading / Empty / Error） |
| Toast | `src/components/AppToast.tsx` | 不依赖 Reanimated/Worklets，避免 UI 线程 worklet 报错 |
| 主题 | `global.css` + `src/theme/` | Tailwind v4 `@theme` 为单一真相，`src/theme` 供非 className 场景使用 |
| 应用更新 | `src/features/updates/` | **双通道**：OTA 热更新（expo-updates）+ APK 自更新（下载+安装），见 `docs/app-updates-guide.md` |

## 目录结构

```
app/                      # 只负责路由与布局组合
├── _layout.tsx           # Provider 装配 + 会话门禁 + 401 跳转
├── index.tsx             # 按登录态重定向
├── (auth)/login.tsx      # 未登录流程
├── (main)/               # 登录后主业务区（Tabs）
│   ├── home.tsx
│   ├── devices.tsx       # 三态齐全的列表参考实现
│   └── profile.tsx
└── modal/confirm.tsx     # Router 模态

src/
├── api/                  # client / endpoints / errors / types
├── features/             # 按业务域组织：auth、devices、notifications
├── components/           # 真正跨业务复用的组件
├── lib/                  # query-client / token-store / secure-storage / device-install-id
├── stores/               # 客户端 UI 状态（非服务端数据）
├── theme/                # 设计令牌的 JS 侧镜像
└── utils/                # logger / platform / debounce / helpers / global-error-handler
```

约定：**页面不直接写 Axios 请求**，一律走 `src/features/<domain>/api.ts`；
**服务端数据不进 Zustand**，避免两份真相。

## 演示账号

- 账号密码：`admin` / `123456`
- 手机验证码：任意手机号 + `123456`

登录逻辑在 `src/features/auth/api.ts`，把 `USE_MOCK` 改为 `false` 即切换到真实后端。

## 环境变量

只有 `EXPO_PUBLIC_` 前缀会打包进客户端，**不能放密钥**。复制 `.env.example` 为 `.env`：

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
EXPO_PUBLIC_REALTIME_URL=wss://api.example.com/ws
```

## 常用命令

```bash
pnpm start        # Metro
pnpm android      # Android
pnpm ios          # iOS
pnpm web          # Web
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm doctor       # expo-doctor
```

## 构建发布（EAS）

```bash
npm i -g eas-cli && eas login
eas init                                   # 写入真实 projectId（替换 app.json 占位符）
eas build -p android --profile preview     # 内测 APK
eas update --branch production -m "..."    # OTA（仅 JS 变更）
```

`app.json` 中的 `android.package` / `ios.bundleIdentifier` / `updates.url` 是**占位值**，
首次发版前必须改成你的真实标识，否则 EAS 会拒绝或串包。

## 已知约束（重要）

1. **lightningcss 必须锁 1.30.1**。NativeWind v5（RC）用 lightningcss 编译 CSS，
   新版 lightningcss 会报 `failed to deserialize ... Specifier`，原生打包直接失败。
   模板里锁了两处：`package.json` 的 `overrides`（npm/yarn 生效）、
   `pnpm-workspace.yaml` 的 `overrides`（pnpm 生效）。
   **pnpm 10+ 不再读取 `package.json` 的 `pnpm` 字段**，只写那里是无效的。
2. **必须保留 `postcss.config.js`**。缺少它 Tailwind 不会被编译，
   表现为 `className` 全部失效、界面无样式（但打包不报错，很难发现）。
3. **`global.css` 用三条 `@import`**，不要合并成 `@import "tailwindcss"`，
   否则 Web 端 utilities 会被压到 default 样式下面。
4. **NativeWind 处于 v5 RC**。生产项目若需要稳定版，可退回 NativeWind v4
   （此时需改用 `tailwind.config.js` + `nativewind/babel`，与本模板配置不同）。
5. `app.json` 中 `orientation` 默认为 **`portrait`（竖屏）**，
   如项目需要横屏优先，改成 `landscape`。
6. `android.package` / `ios.bundleIdentifier` 当前为占位值 `com.company.example`，
   首次发版前**必须**改成你自己的包名，否则会与他人的包冲突或无法上架。

## 测试

```bash
pnpm test              # 跑一次全部单测
pnpm test:watch        # watch 模式
pnpm test:coverage     # 生成覆盖率报告
```

已包含 5 个测试套件 / 34 个用例，覆盖：
- `src/utils/__tests__` — 纯函数边界（isEmpty 对 0/false 的处理）、脱敏逻辑
- `src/api/__tests__` — HTTP status → AppErrorCode 映射、AppError 构造
- `src/components/__tests__` — 组件渲染与交互回调
- `src/features/notifications/__tests__` — 状态转换（去重、未读数、上限）

> **注意**：`@testing-library/react-native` **v14 起 `render` 是 async**，
> 必须 `await render(...)`。写成同步会拿到 Promise，`screen` 会报
> "`render` function has not been called"。

## Development Build

模板已内置 `expo-dev-client`。涉及原生模块、OTA、SecureStore 的验证
**不能只靠 Expo Go**，需要构建 development client：

```bash
npx expo run:android          # 本地构建（需要 Android Studio / SDK）
# 或走 EAS：
eas build -p android --profile development
```

## 从 uni-app（create-zh-uni）迁移

| 能力 | uni 版 | 本模板 |
| --- | --- | --- |
| 路由 | pages.json 集中式 | Expo Router 文件式 `app/` |
| 状态 | Pinia + persistedstate | Zustand + persist |
| 服务端数据 | 手写 loading/分页 | TanStack Query |
| 请求 | uni.request 拦截器 | Axios 拦截器 + AppError |
| 样式 | UnoCSS | NativeWind（Tailwind v4） |
| 热更新 | wgt + version.json | expo-updates OTA + APK 自更新（双通道） |
| token 存储 | Storage | expo-secure-store |
