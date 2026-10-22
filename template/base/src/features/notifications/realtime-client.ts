/**
 * 实时消息客户端抽象
 *
 * 后端用 MQTT 还是 WebSocket 由服务端协议决定，客户端只依赖这个接口。
 * 不要在业务里同时维护两套消息通道。
 */

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed';

export type RealtimeHandler = (payload: unknown, topic: string) => void;

export interface RealtimeClient {
  connect(): Promise<void>;
  subscribe(topic: string, handler: RealtimeHandler): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  disconnect(): Promise<void>;
  /** 当前连接状态 */
  getStatus(): RealtimeStatus;
  /** 订阅状态变化（用于 UI 展示在线/重连提示） */
  onStatusChange(handler: (status: RealtimeStatus) => void): () => void;
}

export interface RealtimeClientOptions {
  /** 连接地址；为空时使用环境变量 EXPO_PUBLIC_REALTIME_URL */
  url?: string;
  /** 取当前 access token（重连时需用最新 token） */
  getToken?: () => string | null;
  /** 最大重连次数，默认 5 */
  maxRetries?: number;
  /** 心跳间隔（毫秒），默认 30s */
  heartbeatInterval?: number;
}
