import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageEnum } from '@/tools/enum';

export interface UserInfo {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  role: string;
  phoneNumber?: string;
}

interface UserState {
  userInfo: UserInfo | null;
  setUserInfo: (info: UserInfo) => void;
  clearUserInfo: () => void;
}

/**
 * 用户信息状态管理（对齐 uni 版 Pinia user store）
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
