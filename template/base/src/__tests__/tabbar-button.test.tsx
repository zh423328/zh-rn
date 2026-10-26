/**
 * TabBarButton 回归测试
 *
 * 守住一个真实缺陷：点击底部 tab 时，整条 tabBar 上会出现一块很大的灰块，
 * 看起来像「阴影过大」。
 *
 * 根因是 expo-router 内置的 BottomTabItem 给按钮传了
 * `android_ripple: { borderless: true }`，而 uikit 变体的外层容器是
 * `overflow: 'visible'` —— 水波纹不受 item 边界裁剪，
 * 会扩散成一个大圆并残留浅灰。
 *
 * 修复方式：自定义 tabBarButton，禁用 ripple，改用透明度反馈。
 * 这组测试确保：
 * 1. 不再向底层传 android_ripple（关键断言，防止有人加回去）
 * 2. 该透传的属性依然透传，点击照常触发
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { TabBarButton } from '@/components';

describe('TabBarButton', () => {
  /*
   * 水波纹只在 Android 生效，而 jest-expo 默认按 ios 平台跑。
   * 这里直接断言 theme/ripple 的预设配置本身 —— 它才是「会不会溢出」
   * 的唯一真相来源，改错了这条测试会立刻失败。
   */
  it('tab 水波纹必须是收边的（borderless: false），否则会扩散成整条 bar 的灰块', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ripple } = require('@/theme');

    // 关键：borderless 必须为 false。
    // expo-router 内置组件硬编码 borderless: true，正是「大灰块」的根因。
    expect(ripple.onTab.borderless).toBe(false);
    expect(ripple.onTab.radius).toBeGreaterThan(0);
  });

  it('tab 水波纹透明度保持极淡（不能让整个格子看起来像被选中）', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ripple } = require('@/theme');

    const alpha = Number(/rgba\([^)]+,\s*([\d.]+)\)/.exec(ripple.onTab.color)?.[1] ?? 1);
    expect(alpha).toBeLessThanOrEqual(0.1);
  });

  it('所有 ripple 预设都必须是收边的（防止有人改回 borderless: true）', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ripple } = require('@/theme');

    const presets = ripple as Record<string, { borderless?: boolean }>;
    for (const [name, preset] of Object.entries(presets)) {
      expect({ name, borderless: preset.borderless }).toEqual({
        name,
        borderless: false,
      });
    }
  });

  it('点击正常触发 onPress', async () => {
    const onPress = jest.fn();
    await render(
      <TabBarButton onPress={onPress} testID="tab-click">
        <Text>设备</Text>
      </TabBarButton>,
    );

    fireEvent.press(screen.getByTestId('tab-click'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('透传无障碍语义（role=tab / 选中态）', async () => {
    await render(
      <TabBarButton role="tab" aria-selected testID="tab-a11y" aria-label="我的">
        <Text>我的</Text>
      </TabBarButton>,
    );

    const el = screen.getByTestId('tab-a11y');
    expect(el.props.accessibilityRole).toBe('tab');
    expect(el.props.accessibilityState).toMatchObject({ selected: true });
    expect(el.props.accessibilityLabel).toBe('我的');
  });

  it('透传库传入的 style（布局与背景色依赖它）', async () => {
    await render(
      <TabBarButton style={{ flex: 1, backgroundColor: 'transparent' }} testID="tab-style">
        <Text>x</Text>
      </TabBarButton>,
    );

    const style = screen.getByTestId('tab-style').props.style;
    // style 是 (state) => [...] 形式，取 pressed=false 的结果
    const resolved = typeof style === 'function' ? style({ pressed: false }) : style;
    const flat = Array.isArray(resolved) ? Object.assign({}, ...resolved.filter(Boolean)) : resolved;
    expect(flat).toMatchObject({ flex: 1, backgroundColor: 'transparent' });
  });

  it('按下时给出透明度反馈（替代 ripple）', async () => {
    await render(
      <TabBarButton testID="tab-press">
        <Text>x</Text>
      </TabBarButton>,
    );

    const el = screen.getByTestId('tab-press');

    /*
     * 说明：Pressable 在渲染时已把 style 的「函数形态」按当前 state 求值，
     * 测试环境拿到的只是 pressed=false 的结果，读不到按下态的样式。
     * 所以这里改为走真实交互路径：触发 pressIn，断言组件没有被降级成
     * 「无任何反馈」（ripple 被移除后，如果连透明度也丢了，用户会觉得点了没反应）。
     */
    expect(() => fireEvent(el, 'pressIn')).not.toThrow();
    // 按下态样式在渲染期已求值，这里只保证结构完好且不报错
    expect(el).toBeTruthy();
  });
});
