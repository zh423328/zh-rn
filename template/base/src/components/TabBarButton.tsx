import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ripple } from '@/theme';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';

/**
 * TabBar 按钮（替换库默认实现）
 *
 * 为什么需要这个组件：
 * expo-router 内置的 BottomTabItem 给按钮传了
 * `android_ripple: { borderless: true }`，而 uikit 变体的外层容器是
 * `overflow: 'visible'`（只有 material 变体才是 hidden）。
 * 两者叠加的结果：点一下 tab，水波纹不受 item 边界裁剪，
 * 在整条 tabBar 上扩散成一个大圆形色块，松手后还残留一层浅灰 ——
 * 看起来很像「一块很大的阴影」，实际上它是 ripple，不是 shadow。
 *
 * 修复方式：把 borderless 改成 false，让水波纹被 tab 项自身边界裁掉。
 * 不引入额外依赖（官方做法是 @react-navigation/elements 的
 * PlatformPressable），直接用 RN 的 Pressable 即可。
 *
 * 注意：其余 props（role / aria-selected / testID 等）必须原样透传，
 * 否则无障碍语义与交互会失效。
 */

interface TabBarButtonProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: ((event: GestureResponderEvent) => void) | null;
  onLongPress?: ((event: GestureResponderEvent) => void) | null;
  testID?: string;
  role?: string;
  'aria-label'?: string;
  'aria-selected'?: boolean;
}

export function TabBarButton({
  children,
  style,
  onPress,
  onLongPress,
  testID,
  role,
  'aria-label': ariaLabel,
  'aria-selected': ariaSelected,
}: TabBarButtonProps) {
  // role 与 aria-selected 是 react-navigation 传进来的无障碍语义，
  // 映射成 RN 的 accessibilityRole / accessibilityState。
  const accessibilityRole = role === 'tab' ? 'tab' : 'button';

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={ariaLabel}
      accessibilityState={{ selected: Boolean(ariaSelected) }}
      /*
       * Android 水波纹：用最淡的一档 + 限制半径。
       *
       * 历史坑：expo-router 内置组件硬编码 borderless: true，
       * 水波纹不受边界裁剪，在整条 tabBar 上扩散成一个大圆并残留浅灰，
       * 看起来像「阴影过大」。
       *
       * 现在用 theme/ripple 的 onTab 预设：
       * - borderless: false → 被 tab 项自身边界裁掉，不再溢出
       * - radius: 56 → 涟漪集中在图标附近，不铺满整列
       * - 透明度 0.07 → 极淡，不会让整个格子看起来像被选中
       * 再叠加按下时的轻微透明度，触感层次比原来更接近原生。
       */
      android_ripple={Platform.OS === 'android' ? ripple.onTab : undefined}
      style={({ pressed }) => [style, pressed ? styles.pressed : null]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /** 按下反馈：轻微变淡，不遮挡图标与文字 */
  pressed: {
    opacity: 0.55,
  },
});
