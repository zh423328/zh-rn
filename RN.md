# React Native + Expo + TypeScript + NativeWind 模板生成器

## 简介

`@zayn919/create-zh-rn` 是一个用于快速创建 React Native 项目的脚手架工具，对齐 uni-app 版模板（`@zayn919/create-zh-uni`）的功能层设计，集成了 Expo、Expo Router、NativeWind、Zustand 等最新主流技术栈。

## 技术栈（2026.10）

- **框架**: Expo SDK 58（React Native 0.88，New Architecture 唯一架构，React 19.3）
- **路由**: Expo Router v7（文件式路由，`src/app` 目录即路由表，支持 typedRoutes 类型安全导航）
- **语言**: TypeScript（strict 模式）
- **状态管理**: Zustand v5 + persist 中间件（AsyncStorage 持久化）
- **请求**: Axios（拦截器统一处理 token / 401 / 业务码）
- **样式**: NativeWind v5 + Tailwind CSS v4（CSS-first 配置，`className` 直接写工具类）
- **热更新**: expo-updates（OTA 更新，对齐 uni-app wgt 热更新思路）
- **React Compiler**: 已开启（`experiments.reactCompiler`，自动 memo 化）

## 安装使用

### 1. 创建项目

```bash
支持的命令格式：
✅ npx @zayn919/create-zh-rn - 交互式创建
✅ npx @zayn919/create-zh-rn my-app - 使用默认模板创建
✅ npx @zayn919/create-zh-rn my-app --template base - 指定模板创建
```

### 2. 项目初始化

创建成功后，按照提示进行后续操作：

```bash
cd your-project-name
pnpm i       # 安装依赖
pnpm start   # 启动开发服务器
```

启动后用 **Expo Go**（手机应用商店下载）扫码即可真机预览，无需配置 Xcode / Android Studio。

### 3. 演示账号

模板内置 mock 登录：

- 账号密码：`admin` / `123456`
- 手机验证码：任意手机号 + `123456`

## 可用命令

### 开发命令

```bash
pnpm start          # 启动 Metro 开发服务器（可扫码）
pnpm ios            # 启动 iOS 模拟器
pnpm android        # 启动 Android 模拟器
pnpm web            # 启动 Web 开发服务器
pnpm lint           # ESLint 检查
pnpm typecheck      # TypeScript 类型检查
```

### 构建发布（EAS）

```bash
npm i -g eas-cli
eas login
eas build:configure                 # 初始化（自动写入 projectId）
eas build -p android --profile preview   # Android APK（内测）
eas build -p all --profile production    # 商店包
eas update --branch production           # 发布 OTA 热更新（见 docs/ota-updates-guide.md）
```

## 目录结构（生成的项目）

```
my-app/
├── app.json                 # Expo 应用配置（名称/图标/启动屏/updates）
├── eas.json                 # EAS 构建配置
├── global.css               # Tailwind v4 入口（CSS-first 主题配置，替代 tailwind.config.js）
├── metro.config.js          # Metro 配置（NativeWind 集成）
├── babel.config.js          # Babel 配置
├── tsconfig.json            # TypeScript 配置（@/ 指向 src/）
├── .env.example             # 环境变量样例（EXPO_PUBLIC_API_BASE_URL）
├── docs/
│   └── ota-updates-guide.md # OTA 热更新发布指南
├── assets/images/           # 图标与启动屏
└── src/
    ├── app/                 # 路由页面（文件即路由）
    │   ├── _layout.tsx      # 根布局：全局样式/路由栈/Toast
    │   ├── index.tsx        # 首页
    │   └── login/index.tsx  # 登录页
    ├── api/                 # 接口层（login.ts / user.ts / login.types.ts）
    ├── config/              # 全局配置（BASE_URL 等）
    ├── hooks/               # 通用 Hooks（useScroll，附使用文档）
    ├── store/               # 状态管理（token.ts / user.ts，Zustand + persist）
    ├── tools/               # 枚举（ResultEnum / StorageEnum）
    └── utils/               # 工具（request 封装 / debounce / updates / toLogin）
```

## 与 uni 版模板的能力对照

| 能力 | uni 版（create-zh-uni） | RN 版（create-zh-rn） |
| --- | --- | --- |
| 路由配置 | pages.json 集中式 | Expo Router 文件式（`src/app/`） |
| 状态管理 | Pinia + persistedstate | Zustand + persist（AsyncStorage） |
| 请求封装 | uni.request + 拦截器 | Axios 拦截器（token/401/业务码/Toast 同语义） |
| 登录示例 | mock 登录 + token/user store | 完全一致（admin/123456） |
| 工具函数 | debounce / useScroll / toLoginPage | debounce + throttle / useScroll / toLogin |
| 热更新 | wgt + version.json | expo-updates OTA + EAS |
| 样式 | UnoCSS | NativeWind（Tailwind v4 语法） |
| 环境变量 | .env（Vite） | .env（EXPO_PUBLIC_ 前缀） |

## 常见问题

**Q: 需要装 Xcode / Android Studio 吗？**
日常开发不需要，Expo Go 扫码即可。需要自定义原生模块或离线打包时再装（或用 EAS 云构建）。

**Q: 为什么用 Zustand 而不是 Redux？**
Zustand 是 Pinia 的精神续作（轻量、无 Provider、天然支持 React 外调用），是当前 RN 社区最主流的选择。

**Q: pnpm 可以吗？**
可以，模板按 pnpm 验证；npm / yarn / bun 同样可用。
