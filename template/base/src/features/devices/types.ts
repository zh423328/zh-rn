/** 设备类型 */
export type DeviceStatus = 'online' | 'offline' | 'locked';

/** 设备信息 */
export interface IDevice {
  id: string;
  name: string;
  status: DeviceStatus;
  /** 服务端分配的业务设备 ID（与客户端安装 ID 区分） */
  serverDeviceId?: string;
  lastOnlineAt?: string;
}

/** 设备注册参数 */
export interface IRegisterDeviceReq {
  /** 安装级设备 UUID（src/lib/device-install-id.ts） */
  installId: string;
  name?: string;
  platform: string;
  appVersion: string;
}
