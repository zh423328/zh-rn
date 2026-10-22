import axios, { type AxiosInstance } from 'axios';
import Toast from 'react-native-toast-message';

import { BASE_URL, REQUEST_TIMEOUT } from '@/config';
import { ResultEnum } from '@/tools/enum';
import { useTokenStore } from '@/store';

import { toLoginPage } from './toLogin';
import type { CustomRequestOptions, IResponse } from './types';

/**
 * 请求封装（语义对齐 uni-app 版模板的 http 工具）：
 * - 自动携带 token
 * - HTTP 401 或业务码 401 时：清除登录态并跳转登录页
 * - 业务码非成功时：弹出后端 msg 提示（可通过 hideErrorToast 关闭）
 * - 网络错误时：弹出友好提示
 *
 * http<T>() 直接返回后端的 data 字段，用法与 uni 版完全一致：
 *   const user = await httpGet<IUserInfoRes>('/user/info')
 */

const instance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：携带 token
instance.interceptors.request.use((config) => {
  const token = useTokenStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function showToast(msg?: string) {
  if (msg) {
    Toast.show({ type: 'error', text1: msg });
  }
}

// 响应拦截器：统一处理业务码与 401
instance.interceptors.response.use(
  (response) => {
    const res = response.data as IResponse;
    const { code } = res ?? {};

    // token 失效：清除登录态并跳转登录页
    if (code === ResultEnum.Unauthorized) {
      useTokenStore.getState().logout();
      toLoginPage();
      return Promise.reject(response);
    }

    // 业务码非成功：弹出提示（约定 0 / 200 均为成功）
    if (code !== ResultEnum.Success0 && code !== ResultEnum.Success200) {
      showToast(res?.msg || res?.message || '请求错误');
    }

    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const options = error?.config as CustomRequestOptions | undefined;

    // HTTP 401：与业务码 401 同样处理
    if (status === ResultEnum.Unauthorized) {
      useTokenStore.getState().logout();
      toLoginPage();
      return Promise.reject(error);
    }

    if (!options?.hideErrorToast) {
      showToast(error?.response?.data?.msg || '请求错误');
    }
    return Promise.reject(error);
  },
);

export async function http<T>(options: CustomRequestOptions): Promise<T> {
  try {
    const response = await instance.request<IResponse<T>>({
      url: options.url,
      method: options.method ?? 'GET',
      data: options.data,
      params: options.params,
      headers: options.header,
      timeout: options.timeout,
    });
    // 直接返回后端 data 字段
    return response.data.data;
  } catch (error: any) {
    // 网络层错误（无 response）
    if (!error?.response && !options?.hideErrorToast) {
      Toast.show({ type: 'error', text1: '网络错误，换个网络试试' });
    }
    throw error;
  }
}

/** GET 请求 */
export function httpGet<T>(
  url: string,
  params?: Record<string, any>,
  header?: Record<string, any>,
  options?: Partial<CustomRequestOptions>,
) {
  return http<T>({ url, params, method: 'GET', header, ...options });
}

/** POST 请求 */
export function httpPost<T>(
  url: string,
  data?: Record<string, any>,
  params?: Record<string, any>,
  header?: Record<string, any>,
  options?: Partial<CustomRequestOptions>,
) {
  return http<T>({ url, data, params, method: 'POST', header, ...options });
}

/** PUT 请求 */
export function httpPut<T>(
  url: string,
  data?: Record<string, any>,
  params?: Record<string, any>,
  header?: Record<string, any>,
  options?: Partial<CustomRequestOptions>,
) {
  return http<T>({ url, data, params, method: 'PUT', header, ...options });
}

/** DELETE 请求（仅 query，无请求体） */
export function httpDelete<T>(
  url: string,
  params?: Record<string, any>,
  header?: Record<string, any>,
  options?: Partial<CustomRequestOptions>,
) {
  return http<T>({ url, params, method: 'DELETE', header, ...options });
}

// 支持与 axios 类似的调用风格
http.get = httpGet;
http.post = httpPost;
http.put = httpPut;
http.delete = httpDelete;

export default http;
