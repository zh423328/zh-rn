import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

/**
 * 入场动画容器：淡入 + 上滑
 *
 * 这是移动端最经典、也最通用的入场动效：
 * 元素从下方轻微上移（默认 12px）并淡入，配合 stagger 逐个出现，
 * 让页面像「铺开」而不是「突然出现」。
 *
 * 为什么用 withTiming 而不是 withSpring：
 * 入场是单向的一次性位移，timing + ease-out 更可控，
 * spring 容易在末尾产生肉眼可见的回弹抖动。按压反馈才用 spring。
 *
 * 无障碍：系统开启「减弱动态效果」时，Reanimated 的
 * ReduceMotion.System（默认值）会自动跳过动画直接到终态，
 * 不需要额外判断。
 *
 * 用法：
 *   <FadeInView delay={0}><Card /></FadeInView>
 *   <FadeInView delay={60} offset={16}><Card /></FadeInView>
 */

interface FadeInViewProps {
  children: ReactNode;
  /** 延迟（毫秒），用于做交错入场 */
  delay?: number;
  /** 初始下移距离（px），0 表示只淡入 */
  offset?: number;
  /** 动画时长（毫秒） */
  duration?: number;
  /** 透传给容器的样式（需要固定尺寸/布局时用） */
  style?: React.ComponentProps<typeof Animated.View>['style'];
  /** 测试标识 */
  testID?: string;
}

export function FadeInView({
  children,
  delay = 0,
  offset = 12,
  duration = 280,
  style,
  testID,
}: FadeInViewProps) {
  // 0 → 1 的进度值，样式全部由它派生，避免维护多个 shared value
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        // ease-out：起步快、收尾缓，符合物体进入视野的自然感
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: offset * (1 - progress.value) }],
  }));

  return (
    <Animated.View testID={testID} style={[styles.base, style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 不设 flex，保持「包裹内容」语义，避免破坏外层布局
  base: {},
});
