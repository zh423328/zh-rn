import { useEffect } from 'react';
import type { ColorValue } from 'react-native';
// SDK 57 的 expo-router（57.x）没有 exports map，`expo-router/js-tabs`
// 子路径不存在，必须从包根导入。SDK 58 才提供 js-tabs 子路径。
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { connectNotifications } from '@/features/notifications/notification-store';
import { TabBarButton } from '@/components';

/**
 * 登录后主业务区
 *
 * 图标方案：@expo/vector-icons（Expo 官方图标库，Ionicons 字体图标）。
 * 之前用字符（⌂ ▤ ☺）当图标：字形基线与库内部 TabBarIcon 的固定高度（28px）
 * 对不上，反复出现「文字被裁 / 只剩图标」。字体图标按库预期的方式渲染，
 * 不再需要任何布局 hack。
 *
 * 布局原则：除颜色与底部安全区外，不自定义 tabBarStyle —— 库默认的
 * 49 + 安全区已为「图标 + 文字」调好，任何额外高度都可能挤压标签。
 */

function TabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  // tabBarIcon 回调给的 color 是 ColorValue（可能是 OpaqueColorValue），
  // Ionicons 的 color 同样接受 ColorValue，直接透传即可
  color: ColorValue;
}) {
  return <Ionicons name={name} size={24} color={color} />;
}

export default function MainLayout() {
  useEffect(() => {
    // 进入主业务区才连实时消息，退出登录分组卸载时断开
    const disconnect = connectNotifications();
    return disconnect;
  }, []);

  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4f7cff',
        tabBarInactiveTintColor: '#8a9099',
        /*
         * 标签位置必须显式固定（关键一）：
         * 不设时库按屏幕尺寸猜 —— 宽 >= 768 或 宽 > 高 会切成 beside-icon
         * （标签与图标同行），默认高度放不下 → 标签消失只剩图标。
         *
         * 高度必须显式给足（关键二）：
         * 用 Playwright 实测库默认布局的真实高度：
         *   bar 48 ＝ item 上下 padding 10 + 图标 28 + 标签仅剩 10px
         * 标签被 flex 压到 10px 且 overflow:hidden，中文字形需要 ~14px，
         * 下半截被裁 —— 这就是「文字只显示一半」的直接原因。
         * 库默认 49 是按英文标签（fontSize 10，单行紧凑）调的，中文不够用。
         *
         * 修复：height 58 + insets.bottom。注意只设 height、不动 paddingBottom
         * （库自己会设 paddingBottom: insets.bottom），这样
         * 内容区 = (58+inset) − inset = 58，在任何平台都是 58：
         *   58 − item padding 10 − 图标 28 = 标签 20px ≥ 16 ✓
         * 之前几轮失败的共性：paddingBottom 也动了，内容区被二次压缩。
         */
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          height: 58 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 16,
        },
        /*
         * 替换默认 tab 按钮，修掉「点 tab 出现一块很大阴影」的问题。
         *
         * 库默认给按钮传 android_ripple: { borderless: true }，而 uikit
         * 变体的外层容器是 overflow: 'visible' —— 水波纹不受 item 边界裁剪，
         * 会在整条 tabBar 上扩散成一个大圆并残留浅灰，看起来就像一块大阴影。
         * 我们改成 borderless: false，让 ripple 被 tab 项自身裁掉。
         */
        tabBarButton: (props) => <TabBarButton {...props} />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '首页',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: '设备',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'person' : 'person-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
