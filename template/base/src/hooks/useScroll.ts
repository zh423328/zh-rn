import { useMemo, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Animated } from 'react-native';

interface UseScrollOptions {
  /** 触发阈值（滚动超过多少 px 算到达），默认 100 */
  threshold?: number;
}

/**
 * 滚动监听 Hook（RN 版，对齐 uni 版 useScroll 的能力）：
 * - scrollY: Animated 值，可直接用于头部渐隐/视差等动画
 * - headerOpacity: 0 → 1 的渐显插值，常用于滚动后显示的吸顶头部
 * - isPastThreshold: 滚动是否超过阈值（用于条件渲染标题等）
 *
 * 实现注意（React Compiler 友好）：
 * 1. Animated.Value 用 useState 惰性初始化，只在挂载时构造一次；
 *    不在渲染期读 ref.current —— 否则触发 react-hooks/refs（error 级）。
 * 2. isPastThreshold 直接 setState，不再用 ref 做「值是否变化」判断：
 *    React 对相同 state 值会自动 bail out，不会多渲染一次。
 *
 * 用法见同目录 useScroll.md。
 */
export function useScroll({ threshold = 100 }: UseScrollOptions = {}) {
  const [scrollY] = useState(() => new Animated.Value(0));
  const [isPastThreshold, setIsPastThreshold] = useState(false);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
          // 值未变化时 React 自动 bail out，无需手工比较
          setIsPastThreshold(e.nativeEvent.contentOffset.y > threshold);
        },
      }),
    [scrollY, threshold],
  );

  const headerOpacity = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, threshold],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    [scrollY, threshold],
  );

  return useMemo(
    () => ({ scrollY, onScroll, headerOpacity, isPastThreshold }),
    [scrollY, onScroll, headerOpacity, isPastThreshold],
  );
}
