import { useEffect } from 'react';
// SDK 57 的 expo-router（57.x）没有 exports map，`expo-router/js-tabs`
// 子路径不存在，必须从包根导入。SDK 58 才提供 js-tabs 子路径。
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { connectNotifications } from '@/features/notifications/notification-store';

/**
 * 登录后主业务区
 *
 * Tab 用 Expo Router 的 Tabs，导航状态由路由统一管理，
 * 不要自己再维护一套 tab 索引。
 *
 * 实时消息连接生命周期跟随本分组挂载：进入主业务区才连，
 * 退回登录页即断开，避免未登录状态下维持长连接。
 *
 * 横屏说明：这里没有写死宽度/高度，靠 flex + safe-area 自适应。
 */

/**
 * Tab 图标
 *
 * 注意：不要再套一层带固定高度的 View。
 * react-navigation 的 TabBarIcon 内部已经给了图标固定高度（ICON_SIZE_TALL），
 * 外面再加 h-6 会让图标区超出 tabBar 的布局预算，把下方的文字标签挤掉
 * —— 这就是之前「只有图标、没有文字」的原因。
 */
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 20,
        lineHeight: 24,
        color: focused ? '#4f7cff' : '#8a9099',
      }}
    >
      {label}
    </Text>
  );
}

export default function MainLayout() {
  useEffect(() => {
    // 返回清理函数：卸载时取消订阅并断开连接
    const disconnect = connectNotifications();
    return disconnect;
  }, []);

  const insets = useSafeAreaInsets();

  /*
   * TabBar 尺寸：按内容反推，别拍脑袋写死。
   *
   * 组成：图标 24 + 文字 16 + 上下内边距 8 + 底部安全区
   * 参考：react-navigation 默认是 49 + inset，中文标签需要更多空间，
   * 这里给到 60 + inset，确保「首页 / 设备 / 我的」完整可见。
   */
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4f7cff',
        tabBarInactiveTintColor: '#8a9099',
        tabBarShowLabel: true,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 16,
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '首页',
          tabBarIcon: ({ focused }) => <TabIcon label="⌂" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: '设备',
          tabBarIcon: ({ focused }) => <TabIcon label="▤" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ focused }) => <TabIcon label="☺" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
