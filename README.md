# zh-rn

创建一个符合中文开发习惯的 React Native 项目脚手架。

基于 **Expo SDK 57**（React Native 0.86）+ **Expo Router v57**（文件式路由）+ **NativeWind v5**（Tailwind CSS v4）+ **TanStack Query v5** + **Zustand v5** + TypeScript strict。

# 切换源

```
默认源 
https://registry.npmmirror.com/
npm config set registry=https://registry.npmjs.org/

npm version patch   # 自动更新版本为 1.0.1
git push --follow-tags

npm publish --access public

npx @zayn919/create-zh-rn

```

## 快速开始

```bash
# 交互式创建
npx @zayn919/create-zh-rn

# 非交互创建（默认 base 模板）
npx @zayn919/create-zh-rn my-rn-app

# 指定模板
npx @zayn919/create-zh-rn my-rn-app --template base
```

```bash
cd my-rn-app
pnpm i
pnpm start
```

## 生成的模板包含

- **路由**：`app/` 下 `(auth)` / `(main)` / `modal` 分组，登录态由根布局统一门禁
- **数据层**：TanStack Query + Axios（统一 `AppError`、401 single-flight 刷新）
- **安全存储**：token 存 `expo-secure-store`；用户信息走 Zustand + AsyncStorage
- **设备标识**：安装级 UUID（`expo-crypto`），随请求上报，不依赖硬件 ID
- **实时消息**：WebSocket 客户端（退避重连 / 心跳 / 前后台切换 / 订阅恢复）
- **稳定性**：Error Boundary、Loading / Empty / Error 三态、脱敏日志
- **OTA**：`expo-updates`，发布流程见模板内 `docs/ota-updates-guide.md`

## 已知约束

模板在 `package.json` 中锁定 `lightningcss@1.30.1`，并依赖根目录的 `postcss.config.js`。
这两项缺一不可——缺前者原生打包直接失败，缺后者 `className` 全部失效但不报错。
详见 [RN.md](./RN.md)。

详细说明见 [RN.md](./RN.md)。
