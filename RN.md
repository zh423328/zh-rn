# React Native + Expo + TypeScript + NativeWind 模板生成器

## 简介

`@zayn919/create-zh-rn` 是一个用于快速创建 React Native 项目的脚手架工具，对齐 uni-app 版模板（`@zayn919/create-zh-uni`）的功能层设计，并按企业级架构基线组织代码分层。

## 技术栈（2026.10）

- **框架**: Expo SDK 57（React Native 0.86，React 19.2）
- **路由**: Expo Router v57（`app/` 目录即路由表，typedRoutes 类型安全导航）
- **语言**: TypeScript（strict 模式）
- **服务端数据**: TanStack Query v5（缓存 / 失效 / 重试策略集中配置）
- **客户端状态**: Zustand v5 + persist（仅非敏感数据）
- **请求**: Axios（拦截器统一处理 token / 401 单飞刷新 / 业务码 → AppError）
- **安全存储**: expo-secure-store（token）；AsyncStorage（用户信息、UI 偏好）
- **样式**: NativeWind v5 + Tailwind CSS v4（CSS-first，`@theme` 定义令牌）
- **热更新**: expo-updates（OTA）+ Android APK 自更新（下载 + 系统安装器）
- **更新策略**: 按 runtimeVersion 自动判断走 OTA 还是换 APK
- **原生验证**: expo-dev-client（development build，不依赖 Expo Go）
- **异常处理**: Error Boundary（渲染期）+ 全局 handler（Promise rejection / JS 异常）
- **测试**: Jest + @testing-library/react-native（5 套件 / 34 用例）
- **React Compiler**: 已开启（`experiments.reactCompiler`）

## 安装使用

### 1. 创建项目

```bash
✅ npx @zayn919/create-zh-rn                    # 交互式创建
✅ npx @zayn919/create-zh-rn my-app             # 使用默认模板创建
✅ npx @zayn919/create-zh-rn my-app --template base
```

### 2. 项目初始化

```bash
cd your-project-name
pnpm i       # 安装依赖（会自动应用 lightningcss 版本锁定）
pnpm start   # 启动开发服务器
```

> **国内镜像**：模板自带 `.npmrc`，默认走 `registry.npmmirror.com`
> （实测 npm 安装从约 3 分钟降到约 1 分钟）。
> 装私有包 / 发布时临时覆盖：`npm install <pkg> --registry=https://registry.npmjs.org`。
> 注意镜像站与新发布版本可能有几分钟同步延迟。

> **日常预览**：Expo Go 扫码可用（模板未引入自定义原生模块）。
> 验证 OTA / SecureStore / 原生权限时，必须用 development build 或正式包。

### 3. 演示账号

模板内置 mock 登录（`src/features/auth/api.ts` 的 `USE_MOCK`）：

- 账号密码：`admin` / `123456`
- 手机验证码：任意手机号 + `123456`

## 可用命令

```bash
pnpm start          # 启动 Metro
pnpm ios            # iOS 模拟器
pnpm android        # Android 模拟器
pnpm web            # Web
pnpm lint           # ESLint
pnpm typecheck      # tsc --noEmit
pnpm doctor         # expo-doctor
pnpm test           # Jest 单测
pnpm test:coverage  # 覆盖率
```

### 构建发布（EAS）

```bash
npm i -g eas-cli
eas login
eas init                                  # 写入真实 projectId
eas build -p android --profile preview    # 内测 APK
eas update --branch production            # OTA 热更新（见模板内 docs/）
```

## 目录结构（生成的项目）

```
my-app/
├── app/                        # 路由层（只做路由与布局组合）
│   ├── _layout.tsx             # Provider 装配 + 会话门禁 + 401 跳转
│   ├── index.tsx               # 按登录态重定向
│   ├── (auth)/login.tsx        # 未登录流程
│   ├── (main)/                 # 登录后主业务（Tabs）
│   │   ├── home.tsx
│   │   ├── devices.tsx         # 三态齐全的列表参考实现
│   │   └── profile.tsx
│   └── modal/confirm.tsx       # Router 模态页
├── global.css                  # Tailwind v4 入口（@theme 设计令牌）
├── postcss.config.js           # 【必须】Tailwind v4 编译入口
├── metro.config.js             # NativeWind 集成
├── app.json / eas.json         # 应用与构建配置
├── docs/app-updates-guide.md
└── src/
    ├── api/                    # client / endpoints / errors / types
    ├── features/               # 按业务域：auth、devices、notifications
    ├── components/             # 跨业务复用组件（ErrorBoundary/Toast/三态）
    ├── lib/                    # query-client / token-store / secure-storage / install-id
    ├── stores/                 # 客户端 UI 状态
    ├── theme/                  # 设计令牌 JS 侧镜像
    ├── hooks/                  # useScroll 等通用 hooks
    └── utils/                  # logger / platform / debounce / updates
```

## 关键设计说明

### 为什么 token 不放 Zustand

token 存 `expo-secure-store`（Keychain / Keystore），通过 `src/lib/token-store.ts`
统一读写并带内存缓存。Zustand + AsyncStorage 只存非敏感用户资料。
这样既避免 token 落到明文存储，也避免拦截器每条请求都读一次 keychain。

### 401 单飞刷新

并发请求同时 401 时，`refreshAccessToken()` 用共享 Promise 保证只刷新一次，
其余请求等待同一个结果后重放（且只重放一次，防死循环）。刷新失败统一登出。

### 服务端数据 vs 客户端状态

- 服务端数据 → TanStack Query（`src/features/*/hooks.ts`）
- 客户端状态 → Zustand（`src/stores/`、`src/features/*/store.ts`）
- 不把 Query 缓存复制进 Zustand，避免两份真相。

### 设备标识

`src/lib/device-install-id.ts` 生成安装级 UUID（expo-crypto），
随请求头发 `X-Install-Id` 上报。**不是** IMEI / 序列号 / MAC / Android ID。
卸载重装会变化——这是预期行为，服务端应据此重建设备档案。

## 已知约束（务必阅读）

| 约束 | 原因 | 表现 |
| --- | --- | --- |
| `lightningcss` 必须锁 `1.30.1` | NativeWind v5 RC 用 lightningcss 编译 CSS，新版本存在反序列化 bug | 原生打包失败：`failed to deserialize ... Specifier` |
| 必须保留 `postcss.config.js` | Tailwind v4 靠 PostCSS 插件编译 | **打包不报错但 `className` 全部失效**，界面无样式 |
| `global.css` 用三条 `@import` | NativeWind v5 要求 utilities 不分层 | Web 端工具类被默认样式覆盖 |
| NativeWind 处于 v5 RC | 稳定版仍是 v4 | 生产项目需评估；退回 v4 要改用 `tailwind.config.js` + `nativewind/babel` |
| `app.json` 占位标识 | `android.package` / `ios.bundleIdentifier` / `updates.url` | 首次发版前必须改成真实值 |
| **Xcode 版本要求** | SDK 57 需要 **Xcode >= 26.4.0** | 低版本 Xcode 下 `expo-doctor` 会报「not compatible with Xcode 26.1.1」；纯 JS 打包与 EAS 云构建不受影响，仅本地 `expo run:ios` 需要升级 |

> **为什么基线是 SDK 57 而不是 58**：NativeWind v5 RC 官方声明其**验证目标**为
> Expo 57.0.22 / RN 0.86.3 / React 19.2.3 / Reanimated 4.5.1 / Worklets 0.10.1，
> 与架构文档指定的 SDK 57 完全吻合。SDK 58 属未验证组合，故以文档基线为准。
>
> 另注：SDK 57 的 `expo-router` **没有 exports map**，`import { Tabs } from 'expo-router/js-tabs'`
> 会解析失败，必须从包根 `import { Tabs } from 'expo-router'`（SDK 58 才引入 js-tabs 子路径）。

## 与 uni 版模板的能力对照

| 能力 | uni 版（create-zh-uni） | RN 版（create-zh-rn） |
| --- | --- | --- |
| 路由配置 | pages.json 集中式 | Expo Router 文件式（`app/`） |
| 状态管理 | Pinia + persistedstate | Zustand + persist |
| 服务端数据 | 手写 loading / 分页 | TanStack Query |
| 请求封装 | uni.request + 拦截器 | Axios + AppError 统一错误 |
| token 存储 | Storage | expo-secure-store |
| 登录示例 | mock 登录 + token/user store | 一致（admin/123456） |
| 工具函数 | debounce / useScroll | debounce + throttle / useScroll |
| 热更新 | wgt + version.json | expo-updates OTA + EAS |
| 样式 | UnoCSS | NativeWind（Tailwind v4） |
| 环境变量 | .env（Vite） | .env（`EXPO_PUBLIC_` 前缀） |

## 常见问题

**Q: 需要装 Xcode / Android Studio 吗？**
日常开发不需要，Expo Go 扫码即可。需要自定义原生模块、验证 OTA/SecureStore 或出 APK 时再装（或用 EAS 云构建）。

**Q: 为什么用 Zustand 而不是 Redux？**
Zustand 轻量、无 Provider、天然支持 React 外调用，是当前 RN 社区主流选择。

**Q: pnpm 可以吗？**
可以，模板按 pnpm 验证；npm / yarn / bun 同样可用。`lightningcss` 锁定同时写入了
`package.json` 的 `overrides`（npm/yarn）与 `pnpm-workspace.yaml` 的 `overrides`（pnpm），
三种包管理器都能生效。

**注意 pnpm 10+ 的破坏性变更**：pnpm 不再读取 `package.json` 里的 `pnpm` 字段
（会警告 `The "pnpm" field in package.json is no longer read`）。
因此 `pnpm.overrides` 这种旧写法**在现代 pnpm 上完全无效**，
必须写到 `pnpm-workspace.yaml` 的 `overrides`。写错的表现是
lockfile 仍解析出 `lightningcss@1.33.0`，Android 打包报
`failed to deserialize; expected an object-like struct named Specifier`。
