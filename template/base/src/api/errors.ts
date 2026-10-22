import { AppErrorCode } from '@/tools/enum';

/**
 * 应用统一错误类型
 *
 * 所有网络层 / 业务层错误都归一到这里，页面只需要判断
 * `error.code` 或直接读 `error.message` 展示，不必再理解 Axios 的错误结构。
 */
export class AppError extends Error {
  /** 应用级错误码 */
  readonly code: AppErrorCode;
  /** 后端业务码（HTTP 层错误时为 HTTP status） */
  readonly businessCode?: number;
  /** 后端返回的原始数据，便于排查 */
  readonly payload?: unknown;
  /** 是否已向用户提示过（避免重复弹 Toast） */
  readonly notified: boolean;

  constructor(
    message: string,
    options: {
      code?: AppErrorCode;
      businessCode?: number;
      payload?: unknown;
      notified?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options.code ?? AppErrorCode.Unknown;
    this.businessCode = options.businessCode;
    this.payload = options.payload;
    this.notified = options.notified ?? false;
  }
}

/** HTTP status → 应用错误码 */
export function mapHttpStatusToCode(status?: number): AppErrorCode {
  if (status === 401) return AppErrorCode.Unauthorized;
  if (status === 408) return AppErrorCode.Timeout;
  if (status && status >= 500) return AppErrorCode.Server;
  return AppErrorCode.Unknown;
}

/** 判断是否为“已登录态失效”类错误 */
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof AppError && error.code === AppErrorCode.Unauthorized;
}
