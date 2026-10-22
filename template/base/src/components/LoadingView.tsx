import { ActivityIndicator, Text, View } from 'react-native';

import { colors } from '@/theme';

interface LoadingViewProps {
  /** 提示文案 */
  message?: string;
  /** 是否铺满剩余空间 */
  fullscreen?: boolean;
}

/** 统一加载态 */
export function LoadingView({ message = '加载中...', fullscreen = true }: LoadingViewProps) {
  return (
    <View
      className={`items-center justify-center ${fullscreen ? 'flex-1' : 'py-8'}`}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="mt-3 text-sm text-text-secondary">{message}</Text>
    </View>
  );
}
