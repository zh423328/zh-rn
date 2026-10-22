/**
 * API 层测试：错误映射
 *
 * 文档 14 节要求覆盖 API 层。这里验证 HTTP status → AppErrorCode 的映射，
 * 以及 AppError 的构造行为。
 */
import { AppError, isUnauthorizedError, mapHttpStatusToCode } from '@/api/errors';
import { AppErrorCode } from '@/tools/enum';

describe('mapHttpStatusToCode', () => {
  it('401 → Unauthorized', () => {
    expect(mapHttpStatusToCode(401)).toBe(AppErrorCode.Unauthorized);
  });

  it('408 → Timeout', () => {
    expect(mapHttpStatusToCode(408)).toBe(AppErrorCode.Timeout);
  });

  it('5xx → Server', () => {
    expect(mapHttpStatusToCode(500)).toBe(AppErrorCode.Server);
    expect(mapHttpStatusToCode(503)).toBe(AppErrorCode.Server);
  });

  it('无 status 或 4xx 其他 → Unknown', () => {
    expect(mapHttpStatusToCode(undefined)).toBe(AppErrorCode.Unknown);
    expect(mapHttpStatusToCode(404)).toBe(AppErrorCode.Unknown);
  });
});

describe('AppError', () => {
  it('默认 code 为 Unknown、notified 为 false', () => {
    const err = new AppError('出错了');
    expect(err.code).toBe(AppErrorCode.Unknown);
    expect(err.notified).toBe(false);
    expect(err.name).toBe('AppError');
    expect(err.message).toBe('出错了');
  });

  it('可携带业务码与 payload', () => {
    const err = new AppError('业务失败', {
      code: AppErrorCode.Business,
      businessCode: 1001,
      payload: { code: 1001, msg: '库存不足' },
    });
    expect(err.businessCode).toBe(1001);
    expect(err.payload).toEqual({ code: 1001, msg: '库存不足' });
  });
});

describe('isUnauthorizedError', () => {
  it('识别 AppError 形式的鉴权失败', () => {
    const err = new AppError('登录失效', { code: AppErrorCode.Unauthorized });
    expect(isUnauthorizedError(err)).toBe(true);
  });

  it('其他错误返回 false', () => {
    expect(isUnauthorizedError(new Error('普通错误'))).toBe(false);
    expect(isUnauthorizedError(null)).toBe(false);
  });
});
