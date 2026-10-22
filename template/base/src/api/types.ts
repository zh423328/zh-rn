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

/** 分页请求参数 */
export interface IPageParams {
  page: number;
  pageSize?: number;
}

/** 分页返回结构 */
export interface IPageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
