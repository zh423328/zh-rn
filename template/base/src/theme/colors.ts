/**
 * 主题令牌
 *
 * 单一真相来源是 global.css 的 @theme 块（Tailwind v4 CSS-first）。
 * 这里导出同一套色值，供 RN 原生组件（StatusBar、placeholder 颜色、
 * 非 className 的场景）使用，避免色值在 JS 与 CSS 中漂移。
 *
 * 改色流程：先改 global.css 的 @theme，再同步本文件。
 */
export const colors = {
  primary: '#4f7cff',
  primaryForeground: '#ffffff',
  background: '#f5f6fa',
  surface: '#ffffff',
  text: '#1f2430',
  textSecondary: '#8a9099',
  danger: '#fa5151',
  success: '#07c160',
  border: '#e6e8ee',
} as const;

/** 间距刻度（4 的倍数，与 Tailwind 默认一致） */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** 圆角 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

/** 字号 */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 28,
} as const;
