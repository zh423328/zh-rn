import { apiClient } from '@/api/client';
import { endpoints } from '@/api/endpoints';
import type { IPageParams, IPageResult } from '@/api/types';
import { getInstallId } from '@/lib/device-install-id';
import { getDeviceContext } from '@/utils/platform';

import type { IDevice, IRegisterDeviceReq } from './types';

/**
 * 设备 API
 *
 * 注意：这里刻意没有做 mock —— 设备域是「接入真实后端」的参考实现，
 * 复制本文件改 endpoints 即可接入你的业务接口。
 * 未接后端时页面会正常进入错误态（不会白屏），便于验证空/错态 UI。
 */

export const deviceApi = {
  list(params: IPageParams): Promise<IPageResult<IDevice>> {
    return apiClient.get<IPageResult<IDevice>>(endpoints.devices.list, { ...params });
  },

  detail(id: string): Promise<IDevice> {
    return apiClient.get<IDevice>(endpoints.devices.detail(id));
  },

  lock(id: string): Promise<void> {
    return apiClient.post<void>(endpoints.devices.lock(id));
  },

  unlock(id: string): Promise<void> {
    return apiClient.post<void>(endpoints.devices.unlock(id));
  },

  /** 用安装级标识注册当前设备 */
  async register(payload?: Partial<IRegisterDeviceReq>): Promise<IDevice> {
    const installId = await getInstallId();
    const ctx = getDeviceContext();
    return apiClient.post<IDevice>(endpoints.devices.register, {
      installId,
      platform: ctx.platform,
      appVersion: ctx.appVersion,
      ...payload,
    });
  },
};
