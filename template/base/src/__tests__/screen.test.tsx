/**
 * 页面容器回归测试
 *
 * 守住一个极难排查的「真机白屏」缺陷：
 * 直接给 react-native-safe-area-context 的 SafeAreaView 写 className，
 * 样式不会生效 —— 该组件是原生组件，不在 react-native-css 的
 * className 注入白名单里，flex:1 与背景色全部丢失，容器高度塌成 0。
 *
 * 表现是最迷惑人的一种：组件正常挂载、日志正常打印、没有任何报错，
 * 但屏幕上什么都没有 —— 本次 Android 白屏就是这个原因。
 *
 * 断言策略：
 * 测试环境不会真的注入 CSS，所以不能断言最终样式。
 * 这里改为断言「className 被交给了 nativewind 的 styled() 包装」，
 * 而不是原样透传给原生 SafeAreaView —— 这正是缺陷与修复的分界线。
 */
import { render, screen } from '@testing-library/react-native';

import { Screen } from '@/components';

// 用探针替换 styled()：记录它收到的 mapping，并把处理后的 className 暴露成 testID，
// 便于断言「确实走过了 nativewind 这一层」。
jest.mock('nativewind', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const React = require('react');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    styled: (BaseComponent: React.ComponentType<Record<string, unknown>>, mapping: unknown) =>
      function StyledProbe(props: Record<string, unknown>) {
        return React.createElement(BaseComponent, {
          ...props,
          testID: 'styled-by-nativewind',
          'data-styled-mapping': JSON.stringify(mapping),
        });
      },
  };
});

describe('页面容器 Screen', () => {
  it('className 必须经过 nativewind 的 styled() 包装', async () => {
    await render(<Screen testID="screen-root" />);

    // 核心断言：渲染出来的是 styled 包装层，不是裸的原生 SafeAreaView
    expect(screen.getByTestId('styled-by-nativewind')).toBeTruthy();
  });

  it('默认 className 带 flex-1 与背景色（容器不会塌成 0 高度）', async () => {
    await render(<Screen testID="screen-default" />);

    const el = screen.getByTestId('styled-by-nativewind');
    expect(el.props.className).toContain('flex-1');
    expect(el.props.className).toContain('bg-background');
  });

  it('自定义 className 覆盖默认值', async () => {
    await render(<Screen testID="screen-custom" className="flex-1 bg-primary" />);

    const el = screen.getByTestId('styled-by-nativewind');
    expect(el.props.className).toBe('flex-1 bg-primary');
  });

  it('style / edges 等原生属性照常透传', async () => {
    await render(<Screen testID="screen-props" edges={['top']} style={{ paddingTop: 12 }} />);

    const el = screen.getByTestId('styled-by-nativewind');
    expect(el.props.edges).toEqual(['top']);
    expect(el.props.style).toEqual({ paddingTop: 12 });
  });
});
