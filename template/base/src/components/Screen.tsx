import type { ComponentProps, ReactNode } from 'react';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';

/**
 * 页面容器（安全区 + className 支持）
 *
 * 为什么必须包这一层：
 * `react-native-safe-area-context` 的 SafeAreaView 是原生组件
 * （NativeSafeAreaView，走 Fabric 的 Codegen 规格），它不在
 * react-native-css 的 className 注入白名单里 —— 白名单只覆盖
 * react-native 自带组件（View/Text/ScrollView/Pressable/...）
 * 和 react-native-safe-area-context 这一个库入口的重新导出。
 *
 * 直接写 `<SafeAreaView className="flex-1 bg-background">` 时：
 * - className 不会被翻译成 style，flex 与背景色全部丢失
 * - 容器没有 flex:1，高度收缩为 0
 * - 结果是「组件已挂载、日志正常，但整屏空白」——最难查的白屏形态
 *
 * 这里用 nativewind 的 styled() 显式补一条 className → style 映射。
 * 项目里所有页面容器都必须用这个 Screen，不要再直接用 SafeAreaView + className。
 *
 * 注意：edges 依然透传给原生组件，安全区计算仍由原生负责，没有改变行为。
 */

const StyledSafeAreaView = styled(RNSafeAreaView, { className: 'style' });

type ScreenProps = ComponentProps<typeof RNSafeAreaView> & {
  children?: ReactNode;
};

export function Screen({ className, style, children, ...rest }: ScreenProps) {
  return (
    <StyledSafeAreaView
      // 默认给安全区页面一个背景色，避免边到边时露出黑色底
      className={className ?? 'flex-1 bg-background'}
      style={style}
      {...rest}
    >
      {children}
    </StyledSafeAreaView>
  );
}
