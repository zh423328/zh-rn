# zh-rn-app

符合中文开发习惯的 React Native 项目模板（由 `@zayn919/create-zh-rn` 生成）。

Expo SDK 58 · Expo Router v7 · NativeWind v5（Tailwind v4）· Zustand v5 · Axios · TypeScript

## 快速开始

```bash
pnpm i
pnpm start
```

用手机上的 **Expo Go** 扫终端二维码即可真机预览；按 `i` / `a` 打开 iOS / Android 模拟器。

## 内置功能

- **登录体系**：mock 登录（admin/123456，验证码 123456），token/user 双 store + 持久化，401 自动踢回登录页
- **请求封装**：`src/utils/request.ts`，拦截器统一注入 token、处理业务码、Toast 报错
- **路由**：`src/app/` 目录文件式路由，`typedRoutes` 提供类型安全的 `router.push('/login')`
- **样式**：`className` 直接写 Tailwind 类，主题色在 `global.css` 的 `@theme` 中配置
- **OTA 热更新**：`src/utils/updates.ts`，发布流程见 `docs/ota-updates-guide.md`

## 目录结构

```
src/
├── app/                # 路由页面（文件即路由）
│   ├── _layout.tsx     # 根布局（全局样式 / Stack / Toast）
│   ├── index.tsx       # 首页
│   └── login/index.tsx # 登录页
├── api/                # 接口层：方法 + .types.ts 类型分离
├── config/             # 全局配置（BASE_URL，读 EXPO_PUBLIC_* 环境变量）
├── hooks/              # 通用 Hooks（useScroll，用法见 useScroll.md）
├── store/              # Zustand（token 持久化 / user）
├── tools/              # 枚举（ResultEnum / StorageEnum）
└── utils/              # request / debounce / throttle / updates / toLogin
```

## 接入真实后端

1. 复制 `.env.example` 为 `.env`，修改 `EXPO_PUBLIC_API_BASE_URL`
2. 打开 `src/api/login.ts`，把 mock 实现替换为注释中的 `http.post(...)` 调用
3. 后端返回结构需符合 `{ code, data, msg }`，成功码 `0` 或 `200`（可在 `src/tools/enum.ts` 调整）

## 环境变量

只有 `EXPO_PUBLIC_` 前缀的变量会暴露给客户端。支持 `.env` / `.env.development` / `.env.production`。

## 主题定制

`global.css` 中的 `@theme` 块即设计令牌（Tailwind v4 CSS-first）：

```css
@theme {
  --color-primary: #4f7cff;   /* 使用方式: bg-primary text-primary */
  --color-danger: #fa5151;    /* 使用方式: bg-danger */
}
```

改完重启 `pnpm start -c` 生效。

## 常用命令

```bash
pnpm ios          # iOS 模拟器
pnpm android      # Android 模拟器
pnpm web          # Web
pnpm lint         # ESLint
pnpm typecheck    # 类型检查
```
