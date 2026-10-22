import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';

import { toast } from '@/components';
import { logger } from '@/utils/logger';

import { checkForUpdates, applyOtaNow } from './api';
import {
  downloadApk,
  installApk,
  verifyApk,
  openUnknownSourcesSettings,
  clearApkCache,
} from './apk';
import { useUpdateStore } from './store';

/**
 * 更新流程 hook
 *
 * 把「检查 → 下载 → 校验 → 安装」串成一条可控流程，
 * 并把状态写入全局 store，供任何组件订阅。
 */
export function useUpdate() {
  const {
    phase,
    decision,
    progress,
    error,
    setPhase,
    setDecision,
    setProgress,
    setError,
    setDismissed,
    reset,
  } = useUpdateStore();

  /** 检查更新（不弹 UI，由调用方决定） */
  const check = useCallback(async () => {
    setPhase('checking');
    setError(null);
    try {
      const result = await checkForUpdates();
      setDecision(result);
      setPhase('idle');
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '检查更新失败';
      setError(msg);
      setPhase('error');
      return null;
    }
  }, [setDecision, setError, setPhase]);

  /** 执行 OTA 更新 */
  const runOta = useCallback(async () => {
    setPhase('downloading');
    try {
      const ok = await applyOtaNow();
      if (ok) {
        setPhase('done');
      } else {
        setPhase('error');
        setError('OTA 更新失败');
      }
      return ok;
    } catch (e) {
      logger.error('updates', 'OTA 更新异常', e);
      setPhase('error');
      setError('OTA 更新失败');
      return false;
    }
  }, [setError, setPhase]);

  /**
   * 下载并安装 APK
   *
   * 流程：下载 → 校验 → 触发系统安装器
   * 注意：安装器是系统 UI，用户取消后我们无法感知，
   * 所以这里只负责「拉起来」，不假设安装结果。
   */
  const runApk = useCallback(async () => {
    const info = useUpdateStore.getState().decision?.info;
    if (!info?.apkUrl) {
      toast.error('缺少安装包地址');
      return false;
    }

    if (Platform.OS !== 'android') {
      toast.info('iOS 请前往 App Store 更新');
      return false;
    }

    try {
      setPhase('downloading');
      setError(null);

      const file = await downloadApk({
        url: info.apkUrl,
        version: info.version,
        onProgress: setProgress,
      });

      setPhase('verifying');
      const check = verifyApk(file, { size: info.apkSize, hash: info.apkHash });
      if (!check.valid) {
        setPhase('error');
        setError(check.reason ?? '安装包校验失败');
        toast.error(check.reason ?? '安装包校验失败');
        return false;
      }

      setPhase('installing');
      await installApk(file);

      setPhase('done');
      // 安装器已拉起，清理缓存留给下次启动
      clearApkCache();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '更新失败';
      logger.error('updates', 'APK 更新失败', e);
      setPhase('error');
      setError(msg);
      toast.error(msg);

      // 常见失败：未开启「安装未知来源应用」
      Alert.alert('需要安装权限', '请允许本应用安装未知来源的应用后重试', [
        { text: '取消', style: 'cancel' },
        { text: '去设置', onPress: () => void openUnknownSourcesSettings() },
      ]);
      return false;
    }
  }, [setError, setPhase, setProgress]);

  /** 用户点了「稍后」 */
  const dismiss = useCallback(() => {
    setDismissed(true);
  }, [setDismissed]);

  return {
    phase,
    decision,
    progress,
    error,
    /** 是否有可用更新 */
    hasUpdate: Boolean(decision?.hasUpdate),
    /** 是否强制更新（不允许关闭） */
    force: Boolean(decision?.force),
    check,
    runOta,
    runApk,
    dismiss,
    reset,
  };
}
