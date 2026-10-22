/**
 * 接口路径集中管理，避免散落魔法字符串。
 * 新增业务模块时按 domain 分组添加。
 */
export const endpoints = {
  auth: {
    login: '/auth/login',
    loginByPhone: '/auth/login/phone',
    sendCode: '/auth/send-code',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    profile: '/user/info',
  },
  devices: {
    list: '/devices',
    detail: (id: string) => `/devices/${id}`,
    lock: (id: string) => `/devices/${id}/lock`,
    unlock: (id: string) => `/devices/${id}/unlock`,
    register: '/devices/register',
  },
  notifications: {
    list: '/notifications',
    read: (id: string) => `/notifications/${id}/read`,
  },
} as const;
