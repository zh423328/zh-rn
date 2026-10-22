import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { logout as _logout } from '@/api/login';
import { StorageEnum } from '@/tools/enum';

import { useUserStore } from './user';

interface TokenState {
  /** 登录凭证 */
  token: string;
  setToken: (val: string) => void;
  /** 退出登录并清除用户信息 */
  logout: () => Promise<void>;
}

/**
 * token 状态管理（对齐 uni 版 Pinia token store）
 * 通过 zustand 的 persist 中间件 + AsyncStorage 自动持久化
 */
export const useTokenStore = create<TokenState>()(
  persist(
    (set) => ({
      token: '',

      setToken: (val) => set({ token: val }),

      logout: async () => {
        try {
          // TODO 实现自己的退出登录逻辑
          await _logout();
        } catch (error) {
          console.error('退出登录失败:', error);
        } finally {
          console.log('退出登录-清除用户信息');
          set({ token: '' });
          useUserStore.getState().clearUserInfo();
        }
      },
    }),
    {
      name: StorageEnum.Token,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
