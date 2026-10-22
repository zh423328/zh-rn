import { logger, sanitize } from './logger';

/**
 * 全局异常捕获
 *
 * 背景：React 的 Error Boundary **只能捕获渲染期错误**，
 * 抓不到以下两类，而这两类正是线上崩溃的主要来源：
 * 1. 事件回调 / 定时器里的同步抛错
 * 2. 未被 await/catch 的 Promise rejection
 *
 * 文档 11 节要求：「未处理 Promise rejection / JS 异常：集中记录，去除敏感字段」。
 * 这里统一接管，并做脱敏后再落日志。
 *
 * 注意：这里只做「记录」，不做「兜底 UI」——渲染错误交给 AppErrorBoundary。
 * 生产环境可在此处把 sanitize 后的数据上报到 Sentry 等服务。
 */

type ErrorUtilsLike = {
  getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

/** 避免重复安装 */
let installed = false;
/** 保留原始处理器，便于链式调用（不吞掉 RN 默认行为） */
let previousHandler: ((error: Error, isFatal?: boolean) => void) | null = null;
/** 防止同一错误在极短时间内重复上报 */
const recentErrors = new Map<string, number>();
const DEDUP_WINDOW_MS = 5_000;

function shouldReport(key: string): boolean {
  const now = Date.now();
  const last = recentErrors.get(key);
  if (last && now - last < DEDUP_WINDOW_MS) return false;
  recentErrors.set(key, now);
  // 简单清理，避免长期占用内存
  if (recentErrors.size > 50) {
    for (const [k, t] of recentErrors) {
      if (now - t > DEDUP_WINDOW_MS) recentErrors.delete(k);
    }
  }
  return true;
}

function report(source: string, error: unknown, extra?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(String(error));
  const key = `${source}:${err.message}`;
  if (!shouldReport(key)) return;

  logger.error('global-error', `[${source}] ${err.message}`, {
    // 只保留可安全记录的信息，堆栈中可能含路径/参数，做脱敏
    stack: sanitize(err.stack ?? ''),
    ...extra,
  });
}

/**
 * 安装全局异常捕获。应在应用入口最早时机调用一次。
 */
export function setupGlobalErrorHandlers(): void {
  if (installed) return;
  installed = true;

  // 1. 未处理的 Promise rejection
  //    RN 中 Promise 是原生实现，没有 Node 的 process 事件，
  //    通过重写全局 handler 的 rejection 追踪实现。
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as typeof globalThis & {
      onunhandledrejection?: (event: { reason?: unknown }) => void;
    };
    const previousRejection = g.onunhandledrejection;
    g.onunhandledrejection = (event: { reason?: unknown }) => {
      report('unhandled-rejection', event?.reason);
      previousRejection?.(event);
    };
  }

  // 2. JS 层未捕获异常（含事件回调抛错）
  const errorUtils = (
    globalThis as typeof globalThis & { ErrorUtils?: ErrorUtilsLike }
  ).ErrorUtils;

  if (errorUtils?.setGlobalHandler) {
    previousHandler = errorUtils.getGlobalHandler?.() ?? null;

    errorUtils.setGlobalHandler((error, isFatal) => {
      report('js-exception', error, { isFatal: Boolean(isFatal) });
      // 继续执行 RN 默认处理（例如 fatal 时触发 redbox / 崩溃上报）
      previousHandler?.(error, isFatal);
    });
  }
}
