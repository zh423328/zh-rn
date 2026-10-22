import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { formatBytes } from '@/features/updates/version';
import { useUpdate } from '@/features/updates/hooks';

/**
 * 更新弹窗
 *
 * 设计要点：
 * - 强制更新时不可关闭（没有「稍后」按钮，也屏蔽返回键）
 * - 下载中展示进度，不允许重复点击
 * - APK 与 OTA 走不同按钮文案，避免用户误解
 */
export function UpdateDialog() {
  const { phase, decision, progress, error, hasUpdate, force, runOta, runApk, dismiss, reset } =
    useUpdate();

  const visible = hasUpdate || phase === 'downloading' || phase === 'installing' || phase === 'error';
  if (!visible) return null;

  const busy = phase === 'downloading' || phase === 'verifying' || phase === 'installing';
  const isApk = decision?.kind === 'apk';
  const info = decision?.info;

  const handlePrimary = () => {
    if (isApk) void runApk();
    else void runOta();
  };

  const handleLater = () => {
    if (force) return;
    dismiss();
    reset();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      // 强制更新时禁止返回键关闭
      onRequestClose={handleLater}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-md rounded-2xl bg-surface p-6">
          <Text className="text-lg font-bold text-text">
            {isApk ? '发现新版本' : '有内容更新'}
          </Text>

          {/* 版本信息 */}
          <View className="mt-2">
            <Text className="text-sm text-text-secondary">
              当前 {decision?.currentVersion}
              {decision?.latestVersion && decision.latestVersion !== decision.currentVersion
                ? ` → ${decision.latestVersion}`
                : ''}
            </Text>
            {isApk && info?.apkSize ? (
              <Text className="mt-1 text-xs text-text-secondary">
                安装包大小约 {formatBytes(info.apkSize)}
              </Text>
            ) : null}
          </View>

          {/* 更新说明 */}
          {info?.releaseNotes ? (
            <ScrollView className="mt-3 max-h-32">
              <Text className="text-xs leading-5 text-text-secondary">{info.releaseNotes}</Text>
            </ScrollView>
          ) : null}

          {/* 进度 */}
          {busy ? (
            <View className="mt-4 flex-row items-center">
              <ActivityIndicator size="small" color="#4f7cff" />
              <Text className="ml-2 text-xs text-text-secondary">
                {phase === 'downloading'
                  ? progress && progress.downloaded > 0
                    ? `正在下载 ${formatBytes(progress.downloaded)}`
                    : '正在下载...'
                  : phase === 'verifying'
                    ? '正在校验安装包...'
                    : '正在打开安装器...'}
              </Text>
            </View>
          ) : null}

          {/* 错误 */}
          {error ? <Text className="mt-3 text-xs text-danger">{error}</Text> : null}

          {/* 强制更新提示 */}
          {force ? (
            <Text className="mt-3 text-xs text-danger">此版本为必要更新，需完成后才能继续使用</Text>
          ) : null}

          {/* 按钮 */}
          <View className="mt-6 flex-row gap-3">
            {!force ? (
              <Pressable
                onPress={handleLater}
                disabled={busy}
                accessibilityRole="button"
                className="h-11 flex-1 items-center justify-center rounded-xl border border-border active:opacity-80 disabled:opacity-40"
              >
                <Text className="text-sm font-semibold text-text">稍后</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handlePrimary}
              disabled={busy}
              accessibilityRole="button"
              className="h-11 flex-1 items-center justify-center rounded-xl bg-primary active:opacity-80 disabled:opacity-60"
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {busy ? '处理中...' : isApk ? '立即更新' : '立即重启更新'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
