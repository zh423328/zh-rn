/** 后端统一响应结构 */
export interface IResponse<T = unknown> {
  /** 业务状态码：0 / 200 表示成功，401 表示未授权 */
  code: number;
  /** 业务数据 */
  data: T;
  /** 错误信息（两种字段名都兼容） */
  msg?: string;
  message?: string;
}

/**
 * 自定义请求配置
 * 继承 axios 配置，附加模板约定的控制项
 */
export interface CustomRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** GET query / POST body */
  data?: Record<string, any>;
  params?: Record<string, any>;
  header?: Record<string, any>;
  /** 请求超时时间（毫秒），默认取全局配置 */
  timeout?: number;
  /** 出错时是否静默（不弹 Toast），默认 false */
  hideErrorToast?: boolean;
}
