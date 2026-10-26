import { Pressable, Text, View } from 'react-native';
import { ripple } from '@/theme';

interface EmptyViewProps {
  title?: string;
  description?: string;
  /** 可选操作按钮 */
  actionLabel?: string;
  onAction?: () => void;
}

/** 统一空态 */
export function EmptyView({
  title = '暂无数据',
  description,
  actionLabel,
  onAction,
}: EmptyViewProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <Text className="text-base font-semibold text-text">{title}</Text>
      {description ? (
        <Text className="mt-2 text-center text-sm text-text-secondary">{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          android_ripple={ripple.onSurface}
          accessibilityRole="button"
          className="mt-5 h-10 items-center justify-center rounded-lg border border-primary px-5 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-primary">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

/** 统一错误态（接口失败时展示，而不是白屏） */
export function ErrorView({ message = '加载失败，请稍后重试', onRetry }: ErrorViewProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <Text className="text-base font-semibold text-text">出错了</Text>
      <Text className="mt-2 text-center text-sm text-text-secondary">{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          android_ripple={ripple.onPrimary}
          accessibilityRole="button"
          className="mt-5 h-10 items-center justify-center rounded-lg bg-primary px-5 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-primary-foreground">重新加载</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
