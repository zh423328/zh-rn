/**
 * 全局枚举（对齐后端约定，可按项目修改）
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

/** 本地持久化存储的 key */
export enum StorageEnum {
  Token = 'zh:token',
  User = 'zh:user',
}
