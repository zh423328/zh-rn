/**
 * 通用环境配置
 * 通过 EXPO_PUBLIC_* 环境变量注入（见 .env.example），
 * 区分开发/生产可在根目录放置 .env.development / .env.production
 */
export const APP_NAME = 'zh-rn-app';

/** 后端接口地址 */
export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.example.com';

/** 请求超时时间（毫秒） */
export const REQUEST_TIMEOUT = 10_000;
