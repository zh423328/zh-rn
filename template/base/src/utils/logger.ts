import { ENABLE_DEBUG_LOG } from '@/config';

/**
 * 统一日志出口
 *
 * 约定：
 * - 不输出 token、密码、身份证号、手机号明文等敏感信息。
 * - 业务日志带上关联 ID（如 requestId / deviceId），便于排查。
 * - release 构建默认关闭 debug 级日志，只保留 warn / error。
 */

type LogPayload = Record<string, unknown> | unknown;

function format(scope: string, message: string, payload?: LogPayload) {
  return payload === undefined ? `[${scope}] ${message}` : `[${scope}] ${message}`;
}

export const logger = {
  debug(scope: string, message: string, payload?: LogPayload) {
    if (!ENABLE_DEBUG_LOG) return;
    if (payload === undefined) console.log(format(scope, message));
    else console.log(format(scope, message), payload);
  },

  info(scope: string, message: string, payload?: LogPayload) {
    if (payload === undefined) console.info(format(scope, message));
    else console.info(format(scope, message), payload);
  },

  warn(scope: string, message: string, payload?: LogPayload) {
    if (payload === undefined) console.warn(format(scope, message));
    else console.warn(format(scope, message), payload);
  },

  error(scope: string, message: string, payload?: LogPayload) {
    if (payload === undefined) console.error(format(scope, message));
    else console.error(format(scope, message), payload);
  },
};

/**
 * 脱敏工具：把手机号/邮箱等转成可安全记录的形式
 */
export function maskPhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}

/** 敏感字段黑名单，配合 sanitize 使用 */
const SENSITIVE_KEYS = [
  'token',
  'accessToken',
  'refreshToken',
  'password',
  'authorization',
  'idCard',
  'secret',
];

/** 从对象中剔除敏感字段，可用于日志与错误上报 */
export function sanitize<T>(input: T): T {
  if (input == null || typeof input !== 'object') return input;

  if (Array.isArray(input)) {
    return input.map((item) => sanitize(item)) as unknown as T;
  }

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
      output[key] = '***';
    } else {
      output[key] = sanitize(value);
    }
  }
  return output as T;
}
