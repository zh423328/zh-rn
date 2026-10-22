/**
 * 纯函数测试：helpers
 *
 * 文档 14 节要求「单元测试：API 层、业务纯函数、状态转换」。
 * 这里覆盖 helpers 的边界情况，作为模板测试范例。
 */
import { isEmpty, sleep } from '@/utils/helpers';

describe('isEmpty', () => {
  it('null / undefined 视为空', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
  });

  it('空字符串 / 空数组视为空', () => {
    expect(isEmpty('')).toBe(true);
    expect(isEmpty([])).toBe(true);
  });

  it('空对象视为空', () => {
    expect(isEmpty({})).toBe(true);
  });

  it('有内容的字符串 / 数组 / 对象不视为空', () => {
    expect(isEmpty('a')).toBe(false);
    expect(isEmpty([0])).toBe(false);
    expect(isEmpty({ a: 1 })).toBe(false);
  });

  it('数字 0 与布尔 false 不视为空', () => {
    // 这是易错点：0 和 false 是合法值，不能被当成空
    expect(isEmpty(0)).toBe(false);
    expect(isEmpty(false)).toBe(false);
  });
});

describe('sleep', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('在指定时间后才 resolve', async () => {
    const spy = jest.fn();
    const promise = sleep(1000).then(spy);

    expect(spy).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1000);
    await promise;

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
