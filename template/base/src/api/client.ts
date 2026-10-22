import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { API_BASE_URL, REQUEST_TIMEOUT } from '@/config';
import { ResultEnum } from '@/tools/enum';
import { logger } from '@/utils/logger';
import { getDeviceContext } from '@/utils/platform';

import { AppError, mapHttpStatusToCode } from './errors';
import type { IResponse } from './types';
import { notifySessionExpired, getAccessToken, refreshAccessToken } from '../lib/token-store';
import { getInstallId } from '../lib/device-install-id';

/**
 * 统一 HTTP 客户端
 *
 * 职责边界：
 * - 注入 baseURL / 超时 / 认证头 / 设备标识头。
 * - 把 HTTP 错误与业务码错误统一成 AppError。
 * - 401 single-flight 刷新 token，刷新失败就触发登出流程（只触发一次）。
 * - 不在这里弹 UI 提示 —— 提示交给调用方或全局 Toast 层，避免网络层依赖 UI。
 *
 * 业务代码不要直接 import axios，统一走 features/<domain>/api.ts → 本文件。
 */

/** 额外配置项 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    /** 为 true 时跳过自动携带 Authorization */
    skipAuth?: boolean;
    /** 为 true 时 401 不触发刷新/登出（用于登录接口本身） */
    skipAuthRefresh?: boolean;
    /** 内部标记：该请求已因 401 刷新 token 后重放过一次 */
    _retried?: boolean;
  }
}

// 用法说明：这里用默认导出调用 axios.create，属预期写法
// （eslint 的 import/no-named-as-default-member 只是提示性 warning，故下方禁用）
// eslint-disable-next-line import/no-named-as-default-member
const instance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// ---------- 请求拦截 ----------
instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (!config.skipAuth) {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }

  // 安装级设备 ID 随请求上报，供服务端建立设备档案
  try {
    config.headers['X-Install-Id'] = await getInstallId();
  } catch {
    // 设备 ID 获取失败不阻断业务请求
  }

  const ctx = getDeviceContext();
  config.headers['X-App-Version'] = ctx.appVersion;
  config.headers['X-Platform'] = ctx.platform;

  return config;
});

// ---------- 响应拦截 ----------
instance.interceptors.response.use(
  (response) => {
    const body = response.data as IResponse | undefined;
    // 非统一结构（如下载、第三方接口）直接放行
    if (!body || typeof body.code !== 'number') return response;

    const { code } = body;

    if (code === ResultEnum.Success0 || code === ResultEnum.Success200) {
      return response;
    }

    if (code === ResultEnum.Unauthorized) {
      handleUnauthorized(response.config);
      return Promise.reject(
        new AppError(body.msg || body.message || '登录已失效', {
          code: mapHttpStatusToCode(401),
          businessCode: code,
          payload: body,
          notified: true,
        }),
      );
    }

    // 业务错误：交给调用方决定如何提示
    return Promise.reject(
      new AppError(body.msg || body.message || '请求失败', {
        code: mapHttpStatusToCode(response.status),
        businessCode: code,
        payload: body,
      }),
    );
  },
  async (error: AxiosError<IResponse>) => {
    const status = error.response?.status;
    const config = error.config;

    // 只重放一次：避免刷新后仍 401 造成无限循环
    if (status === 401 && config && !config.skipAuthRefresh && !config._retried) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
        config._retried = true;
        return instance.request(config);
      }
      return Promise.reject(
        new AppError('登录已失效', {
          code: mapHttpStatusToCode(401),
          businessCode: 401,
          notified: true,
        }),
      );
    }

    if (status === 401) {
      // 显式 skipAuthRefresh 的请求（如登录接口）不改变全局登录态
      return Promise.reject(
        new AppError('登录失败', { code: mapHttpStatusToCode(401), businessCode: 401 }),
      );
    }

    // 超时 / 断网
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return Promise.reject(
        new AppError('请求超时，请稍后重试', { code: mapHttpStatusToCode(408) }),
      );
    }
    if (!error.response) {
      return Promise.reject(
        new AppError('网络异常，请检查网络连接', { code: mapHttpStatusToCode(), cause: error }),
      );
    }

    const body = error.response.data;
    return Promise.reject(
      new AppError(body?.msg || body?.message || `服务异常（${status}）`, {
        code: mapHttpStatusToCode(status),
        businessCode: status,
        payload: body,
        cause: error,
      }),
    );
  },
);

/** 401 处理：清登录态 + 触发一次登出回调 */
function handleUnauthorized(config?: InternalAxiosRequestConfig) {
  if (config?.skipAuthRefresh) return;
  logger.warn('api', '登录态失效，触发登出流程');
  notifySessionExpired();
}

/**
 * 统一请求入口：直接返回后端的 data 字段
 *
 * @example
 * const user = await request<IUserInfoRes>({ url: '/user/info' });
 */
export async function request<T>(config: {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
}): Promise<T> {
  const response = await instance.request<IResponse<T>>({
    url: config.url,
    method: config.method ?? 'GET',
    data: config.data,
    params: config.params,
    headers: config.headers,
    timeout: config.timeout,
    skipAuth: config.skipAuth,
    skipAuthRefresh: config.skipAuthRefresh,
  });

  const body = response.data;
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data;
  }
  return body as unknown as T;
}

export const apiClient = {
  get: <T>(url: string, params?: Record<string, unknown>) => request<T>({ url, params }),
  post: <T>(url: string, data?: unknown) => request<T>({ url, method: 'POST', data }),
  put: <T>(url: string, data?: unknown) => request<T>({ url, method: 'PUT', data }),
  patch: <T>(url: string, data?: unknown) => request<T>({ url, method: 'PATCH', data }),
  delete: <T>(url: string, params?: Record<string, unknown>) =>
    request<T>({ url, method: 'DELETE', params }),
};

export default instance;
