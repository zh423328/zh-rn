/**
 * 脱敏测试
 *
 * 文档 11 节要求日志「去除敏感字段」，这里验证脱敏逻辑真的生效。
 */
import { maskPhone, sanitize } from '@/utils/logger';

describe('maskPhone', () => {
  it('中间四位打码', () => {
    expect(maskPhone('13800138000')).toBe('138****8000');
  });

  it('空值返回空字符串', () => {
    expect(maskPhone('')).toBe('');
    expect(maskPhone(undefined)).toBe('');
  });

  it('非 11 位手机号原样返回（不误伤）', () => {
    expect(maskPhone('123')).toBe('123');
  });
});

describe('sanitize', () => {
  it('剔除 token / password 等敏感字段', () => {
    const input = {
      username: 'admin',
      password: '123456',
      accessToken: 'abc',
      profile: { idCard: '110101199001011234' },
    };

    const output = sanitize(input);

    expect(output.username).toBe('admin');
    expect(output.password).toBe('***');
    expect(output.accessToken).toBe('***');
    expect(output.profile.idCard).toBe('***');
  });

  it('保留非敏感字段原值', () => {
    const output = sanitize({ page: 1, keyword: '设备' });
    expect(output).toEqual({ page: 1, keyword: '设备' });
  });

  it('递归处理数组', () => {
    const output = sanitize([{ token: 'a' }, { name: 'b' }]);
    expect(output[0].token).toBe('***');
    expect(output[1].name).toBe('b');
  });

  it('null / 原始值原样返回', () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize('text')).toBe('text');
  });
});
