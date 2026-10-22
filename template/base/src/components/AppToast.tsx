import { Text, View } from 'react-native';
import Toast, { type ToastConfig } from 'react-native-toast-message';

/**
 * 全局 Toast
 *
 * 选型说明（架构文档第 9 节）：
 * - react-native-toast-message 不依赖 Reanimated / Worklets，
 *   因此不会出现 "synchronously call a non-worklet function on UI thread"。
 * - 关键反馈（登录失败、网络异常）不应依赖复杂动画栈，这个库正合适。
 *
 * 如需换成依赖 Reanimated 的 Toast 库，务必先在 development build 真机验收。
 */

interface ToastCardProps {
  tone: 'success' | 'error' | 'info';
  text1?: string;
  text2?: string;
}

function ToastCard({ tone, text1, text2 }: ToastCardProps) {
  const barClass =
    tone === 'success' ? 'bg-success' : tone === 'error' ? 'bg-danger' : 'bg-primary';

  return (
    <View className="mx-4 w-[92%] flex-row overflow-hidden rounded-xl bg-surface shadow-md">
      <View className={`w-1.5 ${barClass}`} />
      <View className="flex-1 px-4 py-3">
        {text1 ? <Text className="text-sm font-semibold text-text">{text1}</Text> : null}
        {text2 ? <Text className="mt-1 text-xs text-text-secondary">{text2}</Text> : null}
      </View>
    </View>
  );
}

const config: ToastConfig = {
  success: ({ text1, text2 }) => <ToastCard tone="success" text1={text1} text2={text2} />,
  error: ({ text1, text2 }) => <ToastCard tone="error" text1={text1} text2={text2} />,
  info: ({ text1, text2 }) => <ToastCard tone="info" text1={text1} text2={text2} />,
};

/** 挂在根布局下的 Toast 容器 */
export function AppToast() {
  return <Toast config={config} position="top" topOffset={56} visibilityTime={2500} />;
}

/** 统一的提示方法，业务层只调这几个，不直接依赖库 API */
export const toast = {
  success(message: string, description?: string) {
    Toast.show({ type: 'success', text1: message, text2: description });
  },
  error(message: string, description?: string) {
    Toast.show({ type: 'error', text1: message, text2: description });
  },
  info(message: string, description?: string) {
    Toast.show({ type: 'info', text1: message, text2: description });
  },
  hide() {
    Toast.hide();
  },
};
