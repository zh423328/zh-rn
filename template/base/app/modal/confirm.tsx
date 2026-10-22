import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { toast } from '@/components';

/**
 * 确认弹窗（Router modal）
 *
 * 用法：router.push({ pathname: '/modal/confirm', params: { title, message } })
 * 轻量临时操作（筛选、快捷菜单）才考虑 Bottom Sheet；
 * 需要明确确认/取消的动作优先用这个稳定实现。
 */
export default function ConfirmModal() {
  return (
    <View className="flex-1 items-center justify-center bg-black/40 px-6">
      <View className="w-full max-w-sm rounded-2xl bg-surface p-6">
        <Text className="text-base font-semibold text-text">请确认操作</Text>
        <Text className="mt-2 text-sm text-text-secondary">
          这是一个基于 Expo Router 的模态页示例，可替换为具体业务确认内容。
        </Text>

        <View className="mt-6 flex-row gap-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            className="h-11 flex-1 items-center justify-center rounded-xl border border-border active:opacity-80"
          >
            <Text className="text-sm font-semibold text-text">取消</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              toast.success('已确认');
              router.back();
            }}
            accessibilityRole="button"
            className="h-11 flex-1 items-center justify-center rounded-xl bg-primary active:opacity-80"
          >
            <Text className="text-sm font-semibold text-primary-foreground">确认</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
