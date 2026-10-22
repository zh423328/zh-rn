import { useRef, useState } from 'react';
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
 * 用法见同目录 useScroll.md
 */
export function useScroll({ threshold = 100 }: UseScrollOptions = {}) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isPastThreshold, setIsPastThreshold] = useState(false);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        setIsPastThreshold(e.nativeEvent.contentOffset.y > threshold);
      },
    },
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, threshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return {
    scrollY,
    onScroll,
    headerOpacity,
    isPastThreshold,
  };
}
