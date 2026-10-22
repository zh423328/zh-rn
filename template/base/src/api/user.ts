import type { IUserInfoRes } from './login.types';
import { http } from '@/utils/request';

/** 获取用户信息 */
export function getUserInfo() {
  return http.get<IUserInfoRes>('/user/info');
}
