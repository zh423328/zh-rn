/**
 * 防抖：n 毫秒内连续触发只执行最后一次
 *
 * @param fn 需要防抖的函数
 * @param wait 间隔毫秒数，默认 300
 * @param immediate 是否立即执行（首次触发立刻执行，之后进入防抖）
 * @returns 包装后的函数，附带 cancel 方法
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait = 300,
  immediate = false,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const wrapped = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    if (immediate && !timer) {
      fn(...args);
    }
    timer = setTimeout(() => {
      timer = null;
      if (!immediate) fn(...args);
    }, wait);
  };

  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return wrapped;
}

/**
 * 节流：n 毫秒内最多执行一次
 */
export function throttle<T extends (...args: any[]) => any>(fn: T, wait = 300) {
  let lastTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - lastTime);
    if (remaining <= 0) {
      lastTime = now;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };
}
