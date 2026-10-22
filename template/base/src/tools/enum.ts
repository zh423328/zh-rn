/**
 * 全局枚举（对齐后端约定，可按项目实际后端修改）
 */

/** 后端统一响应码 */
export enum ResultEnum {
  /** 成功（code = 0） */
  Success0 = 0,
  /** 成功（code = 200） */
  Success200 = 200,
  /** 未授权 / token 失效 */
  Unauthorized = 401,
}

/** 非敏感数据的本地存储 key（AsyncStorage） */
export enum StorageEnum {
  /** 安装级设备标识（安装实例 UUID，非硬件 ID） */
  InstallId = 'zh:install-id',
  /** 用户信息缓存（不含 token） */
  User = 'zh:user',
  /** 应用 UI 偏好 */
  AppPrefs = 'zh:app-prefs',
}

/** SecureStore 中使用的 key（仅存放小型敏感数据） */
export enum SecureKeyEnum {
  AccessToken = 'zh.accessToken',
  RefreshToken = 'zh.refreshToken',
}

/** 应用级错误码（与后端业务码区分开） */
export enum AppErrorCode {
  Network = 'NETWORK',
  Timeout = 'TIMEOUT',
  Unauthorized = 'UNAUTHORIZED',
  Server = 'SERVER',
  Business = 'BUSINESS',
  Unknown = 'UNKNOWN',
}
