# React Native Expo SDK 57 企业级架构设计文档

> 适用项目：智慧大厅系统（Android / iOS，横屏优先，TypeScript，Expo development build，Android APK 分发）  
> 技术基线：Expo SDK 57、React Native 0.86。SDK 57 于 2026-06-30 发布。  
> 文档目标：提供可逐步落地、可维护、可测试的应用架构与依赖选型基线。  
>
> **版本策略：** 固定 Expo SDK 57 的兼容依赖组合，不追逐单个原生库的“最新版”。升级 SDK 或原生模块前，先在独立分支验证。Expo 官方建议逐个 SDK 版本升级，并使用 `expo install --fix` 与 `expo-doctor` 检查依赖。

---

## 1. 项目目标与约束

### 1.1 目标

- Android / iOS 共用 TypeScript 业务代码。
- Android 以 APK 交付为主，不依赖 Google Play 上架。
- 横屏布局为主要形态，同时避免布局写死导致其他屏幕尺寸异常。
- 具备稳定的页面导航、服务端数据缓存、身份认证、设备标识、消息推送/实时消息、错误监控和发布流程。
- 原生能力通过 Expo config plugins / development build 集成；不能只依赖 Expo Go 验证。

### 1.2 架构原则

1. **Expo SDK 管理原生依赖版本**：优先使用 `npx expo install`。
2. **服务端状态与客户端状态分离**：TanStack Query 管理 API 数据；Zustand 管理少量本地 UI/会话状态。
3. **业务模块不直接依赖底层网络实现**：通过 API service / repository 层隔离。
4. **设备标识不等于硬件永久 ID**：使用安装级随机 UUID + 服务端设备记录；不要把 IMEI、序列号、MAC 当作可靠、可合法获取的通用标识。
5. **原生依赖以 development build 验证**：Expo Go 不代表最终 APK 行为。
6. **权限、密钥、认证 token 最小化存储与授权**。

---

## 2. 技术栈建议

| 层 | 推荐方案 | 说明 |
|---|---|---|
| Runtime | Expo SDK 57 / RN 0.86 | SDK 57 对应 RN 0.86；安装具体 patch 时以官方兼容矩阵为准 |
| 语言 | TypeScript | 开启严格类型检查 |
| 路由 | Expo Router（SDK 57 对应版本） | 文件路由、深链和布局组织；通过 `expo install` 安装匹配版本 |
| 服务端数据 | TanStack Query | 查询缓存、重试、失效、mutation 生命周期 |
| HTTP | Axios | 统一 baseURL、超时、认证头、错误映射 |
| 本地 UI 状态 | Zustand（可选） | UI、筛选条件、轻量客户端状态；不要复制 Query 缓存 |
| 表单 | React Hook Form + Zod（按需） | 表单状态与输入校验 |
| 安全存储 | `expo-secure-store` | token、敏感的小型键值数据；非大文件存储 |
| 安装标识 | `expo-application` + UUID + SecureStore/合适持久化 | 应用信息与安装级 ID 分开；需定义重装后是否重置 |
| 动画/手势 | SDK 57 兼容的 Reanimated、Worklets、Gesture Handler | 通过 `expo install` 对齐，不随意手动升级 |
| Bottom Sheet | `@gorhom/bottom-sheet`（若当前 SDK 57 组合兼容） | 在 development build 真机验收；不兼容时采用 Modal / 原生替代 |
| Toast | 选择与 SDK 57 / RN 0.86 / Worklets 实测兼容的库，或实现轻量自定义 Toast | 避免出现 UI 线程同步调用非 worklet 的错误；Toast 不应依赖动画库也可作为降级方案 |
| 实时消息 | MQTT 客户端或 WebSocket（按服务端协议决定） | 明确连接生命周期、重连、心跳、认证和订阅管理 |
| 构建发布 | EAS Build 或本地 Gradle/Xcode | APK 内测；签名、版本号和更新策略需固定 |

> 包版本不要照抄网络文章中的固定数字。SDK 57 项目使用 `npx expo install <package>` 安装 Expo 管理的原生模块，并查看 `npx expo install --check` / `npx expo-doctor` 的诊断结果。

---

## 3. 推荐目录结构

```text
app/
  _layout.tsx
  index.tsx
  (auth)/
    login.tsx
  (main)/
    _layout.tsx
    home.tsx
    devices.tsx
    profile.tsx
  modal/
    confirm.tsx

src/
  api/
    client.ts
    endpoints.ts
    errors.ts
  features/
    auth/
      api.ts
      hooks.ts
      store.ts
      types.ts
    devices/
      api.ts
      hooks.ts
      types.ts
    notifications/
      mqtt-client.ts
      notification-store.ts
  components/
    AppErrorBoundary.tsx
    AppToast.tsx
    LoadingView.tsx
    EmptyView.tsx
  hooks/
  lib/
    query-client.ts
    secure-storage.ts
    device-install-id.ts
  stores/
    app-store.ts
  theme/
    colors.ts
    spacing.ts
  utils/
    logger.ts
    platform.ts
```

约定：

- `app/` 只负责路由、页面组合和布局。
- `features/<domain>/api.ts` 放业务 API；`hooks.ts` 放 Query hooks。
- 通用网络客户端放 `src/api/client.ts`。
- 不要在页面组件中直接散落 Axios 请求。
- 组件按业务归属组织；只有真正跨业务复用的组件才放 `src/components/`。

---

## 4. Expo SDK 57 初始化与依赖校验

### 4.1 创建 SDK 57 项目

```bash
npx create-expo-app@latest my-app --template default@sdk-57
cd my-app
```

若已有项目，先备份并创建升级分支。升级步骤按 Expo 官方升级指南执行，逐个 SDK 版本迁移，不要一次跨多个 SDK。

### 4.2 安装与检查

```bash
# Expo 管理的原生依赖使用 expo install
npx expo install expo-router expo-secure-store expo-application

# 安装项目所需的业务库（按需）
npm install axios @tanstack/react-query zustand

# 对齐 SDK 推荐版本并检查
npx expo install --fix
npx expo install --check
npx expo-doctor
```

如使用 Reanimated / Worklets / Gesture Handler / Bottom Sheet，分别确认 SDK 57 对应兼容版本。若安装/升级后出现类似 `Tried to synchronously call a non-worklet function ... on UI thread`，先核对版本组合、Babel/插件配置与开发构建，不要仅靠关闭错误或盲目降级解决。

### 4.3 Expo Router 基本入口

Expo Router 项目通常在 `package.json` 中配置：

```json
{
  "main": "expo-router/entry"
}
```

以 SDK 57 模板生成的配置为准；不要覆盖模板中的必要插件或配置。

### 4.4 横屏设置

在 `app.json` / `app.config.ts` 中配置：

```json
{
  "expo": {
    "orientation": "landscape"
  }
}
```

横屏只是默认方向策略。仍应处理不同分辨率、系统栏、平板/手机比例和键盘弹出场景；避免把内容区域固定为某一设备像素尺寸。

---

## 5. 导航与页面布局

推荐使用 Expo Router：

- `(auth)`：登录、验证码、密码重置等未登录流程。
- `(main)`：登录后主业务区。
- `modal/`：确认、选择器、详情等模态页面。
- `_layout.tsx`：声明 Stack / Tabs / providers。

实践建议：

1. 登录状态由 auth store / session service 提供；路由层只根据状态控制可访问页面。
2. Tab 页面使用 Router 对应的 Tabs API，避免自行维护一套与路由重复的导航状态。
3. Android 返回键、深链、横屏模态和登录过期跳转要做真机验收。
4. 重要操作确认框可使用 Router modal 或原生 `Modal`；轻量临时操作才用 Bottom Sheet。

---

## 6. Axios + TanStack Query 数据层

### 6.1 QueryClient

```ts
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

### 6.2 Axios client

```ts
// src/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// 认证 token 应从统一 session 层读取。
// 刷新 token 时需要 single-flight/互斥机制，避免并发请求重复刷新。
apiClient.interceptors.request.use(async (config) => {
  const token = await readAccessToken(); // 项目中实现
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

建议统一处理：

- 网络超时、断网、服务端业务错误、HTTP 错误分别映射成稳定的应用错误类型。
- 401 只触发一次 token refresh / 登录失效流程；防止多个请求同时刷新。
- 日志不得输出 token、密码、身份证号等敏感信息。
- `EXPO_PUBLIC_*` 会被打包进客户端，不能存放服务端 secret。

### 6.3 Query / Mutation 示例

```ts
// src/features/devices/hooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deviceApi } from './api';

export const deviceKeys = {
  all: ['devices'] as const,
  list: (params: { page: number }) => [...deviceKeys.all, 'list', params] as const,
};

export function useDevices(page: number) {
  return useQuery({
    queryKey: deviceKeys.list({ page }),
    queryFn: () => deviceApi.list({ page }),
  });
}

export function useLockDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deviceId: string) => deviceApi.lock(deviceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: deviceKeys.all });
    },
  });
}
```

职责区分：

- `useQuery`：读取并缓存服务端数据。
- `useMutation`：执行创建、更新、删除、锁定等写操作。
- `useQueryClient`：读取/更新缓存、失效查询、清理缓存。

Mutation 的 `onSuccess` 在成功后执行，`onError` 在失败后执行，`onSettled` 无论成功或失败都会执行。以 TanStack Query v5 API 为准，使用对象参数形式。

---

## 7. 登录态与安全存储

### 7.1 Token

- 小型敏感 token 使用 `expo-secure-store`。
- 不要把 access token 放入普通 AsyncStorage、URL、日志或埋点。
- refresh token 生命周期、轮换、撤销策略由后端定义。
- 登出时清理 token、用户缓存和用户私有 Query 数据。

### 7.2 SecureStore 使用边界

SecureStore 适合存储少量密钥类数据，不适合数据库、图片或大对象。需要持久化非敏感业务缓存时，单独评估 AsyncStorage / SQLite 等方案。

### 7.3 安装级设备标识

推荐方案：

1. 首次启动生成随机 UUID。
2. 本地持久化，后续启动复用。
3. 登录或设备注册时发送给服务端，由服务端建立设备记录并分配业务设备 ID。
4. 明确卸载重装、清除数据、换机后的重新注册策略。

该 UUID 是**安装实例标识**，不是硬件不可变 ID。不要依赖 Android 10+ 受限的序列号、IMEI 或 MAC 地址；也不要把 Android ID / iOS IDFV 当作跨重装、跨平台统一 ID。

---

## 8. MQTT / WebSocket 实时消息

根据后端协议选 MQTT 或 WebSocket；不要在客户端同时维护两套没有必要的消息通道。

建议抽象：

```ts
interface RealtimeClient {
  connect(): Promise<void>;
  subscribe(topic: string, handler: (payload: unknown) => void): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  disconnect(): Promise<void>;
}
```

实现时要考虑：

- App 前后台切换与连接状态。
- 网络切换、断线重连退避、最大重试与在线状态展示。
- 登录 token 更新、连接认证和订阅权限。
- 消息去重、顺序、过期时间及服务端确认机制。
- 组件卸载时取消订阅；避免重复注册 handler。
- Android 真机 release 构建下验证网络权限、TLS、后台限制及 broker 可达性。

---

## 9. Toast、Bottom Sheet 与手势

### Toast

先明确需要：成功/失败提示、持续时间、队列、点击关闭、横屏位置、无障碍。

- 选库前检查其是否依赖 Reanimated / Worklets，以及是否声明兼容 RN 0.86。
- 如果曾出现 Worklets UI-thread 错误，优先用 SDK 57 推荐版本重新对齐原生依赖并重建 development build。
- 可接受的降级方案是实现基于 React Native `View` + `Animated` 的简单 Toast，避免让关键反馈依赖复杂动画栈。

### Bottom Sheet

`@gorhom/bottom-sheet` 可用于筛选、操作菜单、列表详情、选择器等交互，但应先验证它与 SDK 57 的 Reanimated、Gesture Handler、Worklets 版本组合。

验收项：

- Android 真机手势与滚动嵌套。
- 横屏高度、键盘、系统导航栏。
- 页面切换、弹层关闭、组件卸载后的引用清理。
- release APK 行为与 development build 一致。

如果兼容性或复杂度不合适，使用 RN `Modal` / Router modal 做稳定替代。

---

## 10. Provider 组合

在根布局中按职责挂载 Provider。示意：

```tsx
// app/_layout.tsx（示意，具体路由布局以 SDK 57 模板为准）
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/query-client';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* 如使用手势库，在其要求的根组件中包裹应用 */}
      <Stack />
    </QueryClientProvider>
  );
}
```

如项目使用 `GestureHandlerRootView`、Toast Provider、Bottom Sheet Provider，按所选库当前文档要求放置；不要机械复制旧版示例。启动阶段需要异步加载字体、恢复 session 时，可用 Splash Screen 控制首屏，避免未初始化状态闪屏。

---

## 11. 错误处理与可观测性

至少覆盖：

- React 渲染错误：Error Boundary + 友好错误页。
- API 错误：统一错误码与提示映射。
- 未处理 Promise rejection / JS 异常：集中记录，去除敏感字段。
- 关键业务日志：登录、设备注册、远程命令结果等应带关联 ID，但避免记录个人敏感数据。
- 线上错误上报：选择支持 RN / Expo 的服务，并在 source map 上传、版本标识、隐私合规方面完成配置。
- 低资源环境下先控制采样率、日志保留和附件大小，不要默认高频上传完整设备日志。

---

## 12. 横屏 UI 规范

- 使用 Flexbox、百分比/约束布局和安全区域，不按单一设备固定绝对坐标。
- 对内容区设置合理最大宽度；超宽屏可采用侧栏 + 主内容布局。
- 表格、设备列表应支持空态、加载态、错误态和长文本截断。
- 系统状态栏、导航栏、键盘和弹层必须在真实横屏设备上测试。
- 关键触控区域保持足够尺寸；确认弹层避免紧贴屏幕边缘。

---

## 13. 构建、签名与 APK 发布

### 13.1 配置

- `android.package` 固定为项目正式 applicationId（当前项目：`com.xinan.ysb`）。
- `version`、`android.versionCode` 由发布流程明确维护。
- 不要把 API secret、签名密码或生产凭证提交到 Git。
- 横屏方向、图标、启动屏、权限说明在 `app.json` / `app.config.ts` 中统一管理。

### 13.2 Development build

需要自定义原生模块时，使用 development build，而不是仅依赖 Expo Go：

```bash
npx expo install expo-dev-client
npx expo run:android
```

使用 EAS 时，按项目配置创建 development profile。每次原生依赖变更后重新构建客户端。

### 13.3 Android APK

EAS Build 的 profile 可配置 APK 输出，例如：

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

实际 `eas.json` 需结合签名和渠道策略调整。构建前检查：

```bash
npx expo-doctor
npx expo export --platform android
```

再执行 EAS 或本地 Gradle 构建。APK 发布前至少完成：

- 真机安装、升级覆盖安装、卸载重装。
- 登录、token 过期、断网恢复。
- 横屏页面、系统返回、键盘、Toast、Bottom Sheet。
- MQTT/WebSocket 连接、后台/前台切换。
- release 模式启动、崩溃、权限与网络验证。
- 版本号、签名、更新包完整性检查。

---

## 14. CI / 代码质量建议

建议纳入：

- TypeScript `strict: true`。
- ESLint + Prettier。
- 单元测试：API 层、业务纯函数、状态转换。
- 组件测试：关键表单与交互。
- CI 中执行 `expo-doctor`、类型检查、Lint、测试。
- 原生依赖或 Expo SDK 升级必须单独 PR，并记录升级前后设备验收结果。

---

## 15. SDK 57 升级与维护规则

1. 先阅读 [SDK 57 release notes](https://expo.dev/sdk/57) 和官方升级指南。
2. 从当前 SDK 逐个版本升级，不跨版本跳跃。
3. 先升级 `expo`，再运行 `npx expo install --fix`、`npx expo-doctor`。
4. 对照 SDK changelog 检查 breaking changes 与原生项目变更。
5. 清理/重建原生项目之前，确认 `android/` 是否有手工修改；若有，先备份并按 prebuild/CNG 策略迁移。
6. 重新构建 development build，完成关键设备验收后再出 release APK。
7. 锁文件进入版本控制；生产构建使用确定的 lockfile，不在 CI 中随意升级依赖。

---

## 16. 实施顺序

### 阶段 A：项目骨架

- SDK 57 项目与 TypeScript strict。
- Expo Router 分组与横屏配置。
- Provider、主题、基础页面状态组件。

### 阶段 B：数据与认证

- Axios client、错误类型、token 安全存储。
- TanStack Query、API hooks、登录/登出。
- 401 与 token refresh 并发处理。

### 阶段 C：业务与设备

- 设备列表/详情/操作 API。
- 安装级设备 UUID 与服务端注册。
- 实时消息 client、重连与订阅生命周期。

### 阶段 D：交互与稳定性

- Toast、Modal / Bottom Sheet。
- Error Boundary、日志和错误上报。
- 横屏、网络切换、后台恢复测试。

### 阶段 E：交付

- Development build 验收。
- Release APK、签名、版本号、更新策略。
- CI 与发布检查清单。

---

## 17. 官方参考

- [Expo SDK 57 发布说明](https://expo.dev/sdk/57)
- [Expo SDK 升级指南](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [Expo Router 文档](https://docs.expo.dev/router/introduction/)
- [Expo SecureStore 文档](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo Application 文档](https://docs.expo.dev/versions/latest/sdk/application/)
- [TanStack Query 文档](https://tanstack.com/query/latest/docs/framework/react/overview)
- [EAS Build 文档](https://docs.expo.dev/build/introduction/)

> **最终原则：** SDK 57 是本项目选定的基线，不代表所有第三方包自动兼容。以 Expo SDK 57 的依赖矩阵、诊断工具和目标设备 release APK 实测结果为准。
