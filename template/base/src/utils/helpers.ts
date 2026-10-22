/**
 * 无依赖的基础工具函数（避免引入 request/router 造成循环引用）
 */

/**
 * 延时等待（常用于模拟请求）
 */
export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * 判断对象/数组/字符串是否为空
 */
export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}
