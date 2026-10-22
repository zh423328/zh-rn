/**
 * NativeWind v5 / react-native-css 的 TypeScript 类型声明。
 *
 * 关键点：必须使用 `react-native-css/types`，不能再用 v4 时代的
 * `nativewind/types`。此文件会被 withNativewind 自动加入 tsconfig.include。
 */
/// <reference types="react-native-css/types" />

/** 允许 side-effect import CSS 文件（NativeWind 全局样式入口） */
declare module '*.css';
