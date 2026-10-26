import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { Platform, Pressable } from 'react-native';
import type { PressableAndroidRippleConfig, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ripple as ripplePresets } from '@/theme';

/**
 * 可按压容器：按下缩小、松手弹回
 *
 * 移动端最经典的触觉反馈动效。相比 opacity 变暗，
 * 缩放给出的「按到了」确认感更强，且不改变视觉重量。
 *
 * 为什么用 spring 而不是 timing：
 * 回弹需要一点自然的过冲（overshoot），timing 会显得生硬。
 * 这里用较大的 damping 抑制抖动，只保留轻微回弹。
 *
 * 为什么用 createAnimatedComponent(Pressable) 而不是外层再套
 * Animated.View：
 * 套一层会多出一个布局盒子，`flex-1` / `mt-4` 这类 className 落在内层，
 * 外层撑不满，行内按钮会被压扁。单组件既保留原有布局语义，
 * 又能直接吃到 transform 动画。
 *
 * 无障碍：系统开启「减弱动态效果」时，Reanimated 的
 * ReduceMotion.System（默认值）会让 spring 直接跳到终态，不产生动画。
 *
 * 用法：
 *   <PressableScale onPress={...} className="h-11 flex-1 items-center justify-center rounded-xl bg-primary">
 *     <Text>登录</Text>
 *   </PressableScale>
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** 按下时的缩放比例，默认 0.96 */
  scaleTo?: number;
  /**
   * Android 水波纹的颜色变体，跟随按钮背景色自动选对：
   * - onPrimary：实心主色/危险色按钮（白字）→ 白色淡化
   * - onSurface：中性浅底 / 描边按钮 → 主色淡化
   * - onPlain：纯文字按钮 → 更淡
   * - none：完全关闭
   * 默认 onPrimary（模板里大多数 PressableScale 都是实心按钮）。
   */
  rippleVariant?: 'onPrimary' | 'onSurface' | 'onPlain' | 'none';
  /** 直接覆盖 ripple 配置（优先级高于 rippleVariant） */
  android_ripple?: PressableAndroidRippleConfig;
  className?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: React.ComponentProps<typeof Pressable>['accessibilityRole'];
  testID?: string;
}

export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled = false,
  scaleTo = 0.96,
  rippleVariant = 'onPrimary',
  android_ripple,
  className,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
  testID,
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    /*
     * React Compiler（本模板 app.json 已开启 experiments.reactCompiler）
     * 会把 `scale` 视为不可变值，直接赋 `.value` 会被 lint 判为
     * "This value cannot be modified"。
     *
     * 这不是写法错误：修改 shared value 的 .value 是 Reanimated 的
     * 官方标准用法，React Compiler 的 immutability 规则认识不到
     * SharedValue 是可变容器。Reanimated 官方文档同样建议对此规则
     * 局部关闭，所以这里只对这一行禁用，不做全局放宽。
     */
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(scaleTo, {
      // 按下要「跟手」，响应快、衰减快
      damping: 20,
      stiffness: 400,
      mass: 0.6,
    });
  }, [scale, scaleTo]);

  const handlePressOut = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSpring(1, {
      // 松手回弹稍缓，读起来更柔和
      damping: 18,
      stiffness: 300,
      mass: 0.6,
    });
  }, [scale]);

  /*
   * 解析最终要用的 ripple 配置：
   * - 非 Android 平台不传（iOS 没有这个概念）
   * - disabled 时不传，避免「禁用按钮还能点出涟漪」的错误暗示
   * - 显式传入的 android_ripple 优先，否则按 rippleVariant 取预设
   */
  const presetRipple =
    Platform.OS === 'android' && rippleVariant !== 'none' && !disabled
      ? (android_ripple ??
        (rippleVariant === 'onSurface'
          ? ripplePresets.onSurface
          : rippleVariant === 'onPlain'
            ? ripplePresets.onPlain
            : ripplePresets.onPrimary))
      : undefined;

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      /*
       * borderless: false（预设里已固定）让水波纹被按钮自身的边界与
       * 圆角裁掉 —— 这是之前 tab 上「大灰块」问题的根治点：
       * borderless: true 时 ripple 不受边界约束，会扩散到整个父容器。
       */
      android_ripple={presetRipple}
      className={className}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
