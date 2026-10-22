/** 账号密码登录参数 */
export interface ILoginReq {
  username: string;
  password: string;
}

/** 手机号验证码登录参数 */
export interface ILoginByPhoneReq {
  phoneNumber: string;
  verificationCode: string;
}

/** 发送验证码参数 */
export interface IVerificationCodeReq {
  phoneNumber: string;
}

/** 用户信息 */
export interface IUserInfo {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  role: string;
  phoneNumber?: string;
}

/** 登录返回 */
export interface ILoginRes {
  access_token: string;
  refresh_token?: string;
  user: IUserInfo;
}

/** token 刷新返回 */
export interface IRefreshTokenRes {
  access_token: string;
  refresh_token?: string;
}
