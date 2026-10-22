import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageEnum } from '@/tools/enum';

import type { IUserInfo } from './types';

interface UserState {
  userInfo: IUserInfo | null;
  setUserInfo: (info: IUserInfo | null) => void;
  clearUserInfo: () => void;
}

/**
 * 用户信息（非敏感，走 AsyncStorage）
 *
 * 注意：token 不放这里 —— token 在 src/lib/token-store.ts → SecureStore。
 * 这里只缓存「已经登录成功后展示用」的用户资料。
 */
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userInfo: null,
      setUserInfo: (info) => set({ userInfo: info }),
      clearUserInfo: () => set({ userInfo: null }),
    }),
    {
      name: StorageEnum.User,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
