import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { logger, sanitize } from '@/utils/logger';
import { ripple } from '@/theme';

interface Props {
  children: ReactNode;
  /** 自定义兜底 UI */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 全局错误边界
 *
 * 作用：捕获 React 渲染期异常，避免整屏白屏。
 * 注意：错误边界抓不到事件回调、Promise rejection，
 * 那两类需要在各自的 async 流程里 try/catch 或注册全局 handler。
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 记录时剔除敏感字段；生产环境可在此接入错误上报服务
    logger.error('error-boundary', '渲染异常', {
      message: error.message,
      stack: sanitize(error.stack),
      componentStack: info.componentStack,
    });
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) return children;
    if (fallback) return fallback(error, this.reset);

    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-lg font-semibold text-text">页面出了点问题</Text>
        <Text className="mt-2 text-center text-sm text-text-secondary">
          已记录该异常，你可以重试或重启应用。
        </Text>
        {__DEV__ ? (
          <Text className="mt-4 text-center text-xs text-danger" numberOfLines={6}>
            {error.message}
          </Text>
        ) : null}
        <Pressable
          onPress={this.reset}
          android_ripple={ripple.onPrimary}
          accessibilityRole="button"
          className="mt-6 h-11 items-center justify-center rounded-xl bg-primary px-6 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-primary-foreground">重试</Text>
        </Pressable>
      </View>
    );
  }
}
