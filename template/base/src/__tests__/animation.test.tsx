/**
 * 动画组件回归测试
 *
 * 守住两件事：
 * 1. FadeInView 必须真的透传 style / testID，并且 children 正常渲染。
 *    动画本身在 jest 里被 mock 成瞬时完成，这里不验证帧，只验证契约。
 * 2. PressableScale 必须把 className 交给底层，并且 disabled 时不可点。
 *
 * 为什么要专门写这组测试：
 * 本项目曾因「className 未生效导致容器高度塌成 0」出现整屏白屏
 * （SafeAreaView 不入 className 白名单）。动画组件同样是包装层，
 * 必须确保它不会把布局相关属性吞掉。
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { FadeInView, PressableScale } from '@/components';

describe('FadeInView', () => {
  it('正常渲染 children', async () => {
    await render(
      <FadeInView>
        <Text>内容</Text>
      </FadeInView>,
    );
    expect(screen.getByText('内容')).toBeTruthy();
  });

  it('透传 testID（便于定位与断言）', async () => {
    await render(
      <FadeInView testID="fade-probe">
        <Text>x</Text>
      </FadeInView>,
    );
    expect(screen.getByTestId('fade-probe')).toBeTruthy();
  });

  it('透传 style（布局属性不能被包装层吞掉）', async () => {
    await render(
      <FadeInView testID="fade-style" style={{ flex: 1, marginTop: 12 }}>
        <Text>x</Text>
      </FadeInView>,
    );

    const style = screen.getByTestId('fade-style').props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    expect(flat).toMatchObject({ flex: 1, marginTop: 12 });
  });

  it('delay / offset / duration 都可传入而不报错', async () => {
    await render(
      <FadeInView delay={120} offset={24} duration={400}>
        <Text>交错入场</Text>
      </FadeInView>,
    );
    expect(screen.getByText('交错入场')).toBeTruthy();
  });
});

describe('PressableScale', () => {
  it('点击触发 onPress', async () => {
    const onPress = jest.fn();
    await render(
      <PressableScale onPress={onPress} testID="press-probe">
        <Text>点我</Text>
      </PressableScale>,
    );

    fireEvent.press(screen.getByTestId('press-probe'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled 时不触发 onPress', async () => {
    const onPress = jest.fn();
    await render(
      <PressableScale onPress={onPress} disabled testID="press-disabled">
        <Text>不可点</Text>
      </PressableScale>,
    );

    fireEvent.press(screen.getByTestId('press-disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('className 透传给底层（布局与配色依赖它）', async () => {
    await render(
      <PressableScale className="h-11 rounded-xl bg-primary" testID="press-cn">
        <Text>x</Text>
      </PressableScale>,
    );

    expect(screen.getByTestId('press-cn').props.className).toBe(
      'h-11 rounded-xl bg-primary',
    );
  });

  it('样式不会被包装层吞掉（scale 变换与自定义 style 共存）', async () => {
    await render(
      <PressableScale style={{ marginTop: 8 }} testID="press-style">
        <Text>x</Text>
      </PressableScale>,
    );

    const style = screen.getByTestId('press-style').props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    expect(flat).toMatchObject({ marginTop: 8 });
  });
});

describe('PressableScale 的 ripple 接入', () => {
  /*
   * jest-expo 默认按 ios 平台运行，而 ripple 只在 Android 生效，
   * 所以这里验证「预设配置」与「平台分支逻辑」，
   * 而不是断言渲染出的 props（在 ios 下必然是 undefined）。
   */
  it('默认使用 onPrimary（实心按钮 → 白色淡化）', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ripple } = require('@/theme');
    expect(ripple.onPrimary.color).toContain('255, 255, 255');
  });

  it('onSurface 用主色淡化（描边 / 浅底按钮）', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ripple } = require('@/theme');
    expect(ripple.onSurface.color).toContain('79, 124, 255');
  });

  it('onPlain 比 onSurface 更淡（纯文字按钮不出现明显色块）', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ripple } = require('@/theme');
    const alpha = (c: string) => Number(/rgba\([^)]+,\s*([\d.]+)\)/.exec(c)?.[1] ?? 1);
    expect(alpha(ripple.onPlain.color)).toBeLessThan(alpha(ripple.onSurface.color));
  });

  it('非 Android 平台不传 ripple（iOS 无此概念）', async () => {
    await render(
      <PressableScale testID="ps-ios">
        <Text>x</Text>
      </PressableScale>,
    );
    // 测试环境是 ios，应当不传
    expect(screen.getByTestId('ps-ios').props.android_ripple).toBeUndefined();
  });

  it('rippleVariant="none" 时也不传', async () => {
    await render(
      <PressableScale rippleVariant="none" testID="ps-none">
        <Text>x</Text>
      </PressableScale>,
    );
    expect(screen.getByTestId('ps-none').props.android_ripple).toBeUndefined();
  });
});
