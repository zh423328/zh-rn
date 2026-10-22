const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

/**
 * Metro 配置
 *
 * withNativewind 的 input 必须指向「项目根目录的 global.css」。
 * 如果 app/ 移进了 src/，这个路径保持不变（CSS 入口仍在根目录），
 * 但 _layout.tsx 里的 import 相对路径要同步调整。
 *
 * 不要按 v4 的习惯加 'nativewind/babel' 预设——v5 已移除该预设。
 */
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config, {
  input: './global.css',
});
