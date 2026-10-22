import { endpoints } from '@/api/endpoints';
import { sleep } from '@/utils/helpers';

import type {
  ILoginByPhoneReq,
  ILoginReq,
  ILoginRes,
  IRefreshTokenRes,
  IUserInfo,
  IVerificationCodeReq,
} from './types';

/**
 * 认证 API
 *
 * 模板默认使用 mock（演示账号 admin / 123456，验证码 123456），
 * 让对方 clone 下来即可跑通登录流程。
 *
 * 接入真实后端时：
 * 1. 把 `USE_MOCK` 改为 false（或直接删掉 mock 分支）。
 * 2. 确认后端返回结构符合 { code, data, msg }，字段名与 types.ts 对齐。
 */

const USE_MOCK = true;

/** 账号密码登录 */
export async function loginByAccount(data: ILoginReq): Promise<ILoginRes> {
  if (!USE_MOCK) {
    return requestLogin<ILoginRes>(endpoints.auth.login, data);
  }

  await sleep(200);
  if (data.username === 'admin' && data.password === '123456') {
    return {
      access_token: `mock_token_${Date.now()}`,
      refresh_token: `mock_refresh_${Date.now()}`,
      user: {
        id: 1,
        username: data.username,
        nickname: '管理员',
        avatar: '',
        role: 'admin',
      },
    };
  }
  throw new Error('用户名或密码错误');
}

/** 手机号验证码登录 */
export async function loginByPhone(data: ILoginByPhoneReq): Promise<ILoginRes> {
  if (!USE_MOCK) {
    return requestLogin<ILoginRes>(endpoints.auth.loginByPhone, data);
  }

  await sleep(200);
  if (data.verificationCode === '123456') {
    return {
      access_token: `mock_token_${Date.now()}`,
      refresh_token: `mock_refresh_${Date.now()}`,
      user: {
        id: 2,
        username: data.phoneNumber,
        nickname: `用户${data.phoneNumber.slice(-4)}`,
        avatar: '',
        role: 'user',
        phoneNumber: data.phoneNumber,
      },
    };
  }
  throw new Error('验证码错误');
}

/** 发送验证码 */
export async function sendVerificationCode(
  data: IVerificationCodeReq,
): Promise<{ code: number; message: string }> {
  if (!USE_MOCK) {
    return requestLogin<{ code: number; message: string }>(endpoints.auth.sendCode, data);
  }
  await sleep(500);
  return { code: 200, message: '验证码已发送' };
}

/** 刷新 token（由 src/lib/token-store.ts 的 refreshHandler 调用） */
export async function refreshToken(token: string): Promise<IRefreshTokenRes> {
  if (!USE_MOCK) {
    const result = await requestLogin<IRefreshTokenRes>(endpoints.auth.refresh, {
      refresh_token: token,
    });
    return { access_token: result.access_token, refresh_token: result.refresh_token };
  }
  await sleep(100);
  return { access_token: `mock_token_${Date.now()}`, refresh_token: token };
}

/** 获取用户信息 */
export async function fetchUserInfo(): Promise<IUserInfo> {
  if (!USE_MOCK) {
    return requestLogin<IUserInfo>(endpoints.auth.profile, undefined, 'GET');
  }
  await sleep(100);
  throw new Error('mock 模式下请从登录结果读取用户信息');
}

/** 退出登录（后端注销刷新令牌） */
export async function logoutRequest(): Promise<void> {
  if (!USE_MOCK) {
    await requestLogin<void>(endpoints.auth.logout, undefined, 'GET');
    return;
  }
  await sleep(50);
}

// 延迟引入，避免 USE_MOCK 场景下把 axios 依赖链拉进 mock 路径
async function requestLogin<T>(
  url: string,
  data?: unknown,
  method: 'GET' | 'POST' = 'POST',
): Promise<T> {
  const { request } = await import('@/api/client');
  return request<T>({ url, method, data, skipAuthRefresh: true });
}
