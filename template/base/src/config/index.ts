/**
 * 全局环境配置
 *
 * 只有 EXPO_PUBLIC_ 前缀的变量会被打包进客户端，
 * 因此这里只能放「公开」配置，绝不能放服务端密钥。
 */
export const APP_NAME = 'zh-rn-app';

/** 后端接口地址（.env 中的 EXPO_PUBLIC_API_BASE_URL） */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.example.com';

/** 请求超时时间（毫秒） */
export const REQUEST_TIMEOUT = 15_000;

/** 是否输出调试日志（release 构建自动关闭） */
export const ENABLE_DEBUG_LOG = __DEV__;

/**
 * 非敏感数据的 AsyncStorage key 前缀。
 * 敏感数据（token 等）走 expo-secure-store，见 src/lib/secure-storage.ts。
 */
export const STORAGE_PREFIX = 'zh:';
