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
 * Tab 图标区
 *
 * 用固定高度容器包裹，避免图标字形把 tabBar 撑得不均匀；
 * 文字标签交给 tabBarLabel（由导航本身渲染），不要塞进 icon 里。
 */
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View className="h-6 items-center justify-center">
      <Text className={focused ? 'text-lg text-primary' : 'text-lg text-text-secondary'}>
        {label}
      </Text>
    </View>
  );
}

export default function MainLayout() {
  useEffect(() => {
    // 返回清理函数：卸载时取消订阅并断开连接
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
        // 高度 = 内容高度 + 底部安全区，否则手势条（home indicator）
        // 会压住中文标签，出现「文字显示不全」。
        tabBarStyle: {
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
        },
        // 中文标签需要足够行高，否则会被裁切
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
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
