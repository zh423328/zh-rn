# useScroll 使用说明

滚动监听 Hook，基于 RN 内置 `Animated`（Native Driver，无第三方依赖）。

## 基础用法：滚动渐显吸顶头部

```tsx
import { Animated, ScrollView, Text, View } from 'react-native';
import { useScroll } from '@/hooks/useScroll';

export default function Demo() {
  const { onScroll, headerOpacity, isPastThreshold } = useScroll({ threshold: 100 });

  return (
    <View className="flex-1">
      {/* 吸顶头部：随滚动渐显 */}
      <Animated.View
        className="absolute top-0 left-0 right-0 z-10 h-16 items-center justify-center bg-white"
        style={{ opacity: headerOpacity }}
      >
        <Text className="text-base font-semibold text-text">页面标题</Text>
      </Animated.View>

      <ScrollView onScroll={onScroll} scrollEventThrottle={16}>
        {/* 页面内容 */}
      </ScrollView>
    </View>
  );
}
```

## 参数

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| threshold | number | 100 | 滚动阈值（px） |

## 返回值

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| scrollY | Animated.Value | 原始滚动偏移，可自行 interpolate |
| onScroll | Animated.Event | 直接绑定到 ScrollView 的 onScroll |
| headerOpacity | Animated.AnimatedInterpolation | 0→1 渐显插值 |
| isPastThreshold | boolean | 是否超过阈值（JS 线程状态，用于条件渲染） |

## 实现说明

`Animated.Value` 通过 `useState` 惰性初始化，只在挂载时创建一次；
不在渲染期读 `ref.current`，以符合 React Compiler 开启后
`react-hooks/refs` 规则的 error 级别要求。

`isPastThreshold` 只在跨过阈值时 setState，不会每个滚动帧都重渲染。
