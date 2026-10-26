import type { PressableAndroidRippleConfig } from 'react-native';

/**
 * Android 水波纹（ripple）统一配置
 *
 * 为什么统一管理：
 * 1. 颜色必须按「背景色」区分。Material 规范里 ripple 用的是
 *    on-color（压在底色之上的对比色）——深色按钮用白色淡化，
 *    浅色按钮用主色淡化。用错就会出现「整块发灰」的脏效果。
 * 2. borderless 必须是 false。之前 tab 上的大灰块就是因为
 *    expo-router 内置组件硬编码了 borderless: true，
 *    水波纹不受边界裁剪，在整条 tabBar 上扩散成一个大圆。
 *    borderless: false 时 ripple 会被 View 的边界与圆角裁掉，
 *    这才是标准 Material 观感。
 * 3. 透明度要比 Material 默认值更低。默认 ripple 在很多 ROM
 *    （尤其 MIUI）上偏重，压在浅色界面上像一块脏渍。
 *
 * 用法：
 *   <Pressable android_ripple={ripple.onSurface} />
 *   <Pressable android_ripple={ripple.onPrimary} />
 */

/** 与 global.css 的 --color-primary 保持一致 */
const PRIMARY_RGB = '79, 124, 255';

export const ripple = {
  /**
   * 实心主色按钮（蓝底白字）
   * 白色淡化：压在蓝底上呈现「被点亮」的观感
   */
  onPrimary: {
    color: 'rgba(255, 255, 255, 0.22)',
    borderless: false,
  } satisfies PressableAndroidRippleConfig,

  /**
   * 实心危险按钮（红底白字）
   */
  onDanger: {
    color: 'rgba(255, 255, 255, 0.22)',
    borderless: false,
  } satisfies PressableAndroidRippleConfig,

  /**
   * 浅底 / 描边按钮（白底、背景色底）
   * 主色淡化：与主色呼应，不会显得脏
   */
  onSurface: {
    color: `rgba(${PRIMARY_RGB}, 0.10)`,
    borderless: false,
  } satisfies PressableAndroidRippleConfig,

  /**
   * 纯文字按钮（无底色）
   * 更淡，避免在空白处出现明显色块
   */
  onPlain: {
    color: `rgba(${PRIMARY_RGB}, 0.08)`,
    borderless: false,
  } satisfies PressableAndroidRippleConfig,

  /**
   * 底部 Tab
   * 极淡：tab 项本身是「图标 + 文字」的整列矩形，
   * 任何稍重的颜色都会让整个格子变色，像被选中一样。
   * 再配合 PressableScale 的透明度反馈，触感足够但不喧宾夺主。
   */
  onTab: {
    color: `rgba(${PRIMARY_RGB}, 0.07)`,
    borderless: false,
    // 限制扩散半径，让涟漪集中在图标附近而不是铺满整列
    radius: 56,
  } satisfies PressableAndroidRippleConfig,
} as const;
