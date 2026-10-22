import { useEffect } from 'react';
// SDK 57 的 expo-router（57.x）没有 exports map，`expo-router/js-tabs`
// 子路径不存在，必须从包根导入。SDK 58 起才提供 js-tabs 子路径。
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

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

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text className={focused ? 'text-base text-primary' : 'text-base text-text-secondary'}>
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4f7cff',
        tabBarInactiveTintColor: '#8a9099',
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
