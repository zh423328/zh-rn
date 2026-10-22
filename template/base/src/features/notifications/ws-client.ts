import { AppState, type AppStateStatus } from 'react-native';

import { logger } from '@/utils/logger';

import type {
  RealtimeClient,
  RealtimeClientOptions,
  RealtimeHandler,
  RealtimeStatus,
} from './realtime-client';

/**
 * 基于 WebSocket 的实时客户端实现
 *
 * 覆盖的工程点（架构文档第 8 节）：
 * - 断线重连 + 指数退避 + 最大重试
 * - 心跳保活，避免中间层空闲断链
 * - App 前后台切换：后台主动断开，回前台重连（Android 后台长连接不可靠）
 * - 订阅表在重连后自动恢复
 * - 重复注册 handler 去重、卸载时清理
 *
 * 若后端是 MQTT，保留 RealtimeClient 接口，替换本文件内部实现即可。
 */

const WS_OPEN = 1;

interface Subscription {
  handlers: Set<RealtimeHandler>;
}

export class WebSocketRealtimeClient implements RealtimeClient {
  private ws: WebSocket | null = null;
  private status: RealtimeStatus = 'idle';
  private subscriptions = new Map<string, Subscription>();
  private statusListeners = new Set<(status: RealtimeStatus) => void>();
  private retries = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private manuallyClosed = false;

  private readonly url: string;
  private readonly getToken?: () => string | null;
  private readonly maxRetries: number;
  private readonly heartbeatInterval: number;

  constructor(options: RealtimeClientOptions = {}) {
    this.url = options.url ?? process.env.EXPO_PUBLIC_REALTIME_URL ?? '';
    this.getToken = options.getToken;
    this.maxRetries = options.maxRetries ?? 5;
    this.heartbeatInterval = options.heartbeatInterval ?? 30_000;
  }

  getStatus(): RealtimeStatus {
    return this.status;
  }

  onStatusChange(handler: (status: RealtimeStatus) => void): () => void {
    this.statusListeners.add(handler);
    // 立即回放当前状态，避免 UI 拿不到初始值
    handler(this.status);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  async connect(): Promise<void> {
    if (!this.url) {
      logger.warn('realtime', '未配置 EXPO_PUBLIC_REALTIME_URL，跳过连接');
      return;
    }
    if (this.ws?.readyState === WS_OPEN) return;

    this.manuallyClosed = false;
    this.attachAppStateListener();
    this.setStatus(this.retries > 0 ? 'reconnecting' : 'connecting');

    await new Promise<void>((resolve) => {
      try {
        const token = this.getToken?.();
        const separator = this.url.includes('?') ? '&' : '?';
        const target = token ? `${this.url}${separator}token=${encodeURIComponent(token)}` : this.url;

        const socket = new WebSocket(target);
        this.ws = socket;

        socket.onopen = () => {
          this.retries = 0;
          this.setStatus('connected');
          this.startHeartbeat();
          this.restoreSubscriptions();
          resolve();
        };

        socket.onmessage = (event) => {
          this.dispatch(event.data);
        };

        socket.onerror = (event) => {
          logger.warn('realtime', 'WebSocket 错误', event);
        };

        socket.onclose = () => {
          this.stopHeartbeat();
          this.ws = null;
          if (!this.manuallyClosed) this.scheduleReconnect();
          resolve();
        };
      } catch (error) {
        logger.error('realtime', '建立连接失败', error);
        this.scheduleReconnect();
        resolve();
      }
    });
  }

  async subscribe(topic: string, handler: RealtimeHandler): Promise<void> {
    const existing = this.subscriptions.get(topic);
    if (existing) {
      // 去重：同一函数重复订阅不会重复触发
      existing.handlers.add(handler);
      return;
    }

    this.subscriptions.set(topic, { handlers: new Set([handler]) });
    this.sendSubscribe(topic);
  }

  async unsubscribe(topic: string): Promise<void> {
    if (!this.subscriptions.delete(topic)) return;
    this.send({ type: 'unsubscribe', topic });
  }

  async disconnect(): Promise<void> {
    this.manuallyClosed = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    this.detachAppStateListener();

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('closed');
  }

  // ---------- 内部实现 ----------

  private setStatus(next: RealtimeStatus) {
    if (this.status === next) return;
    this.status = next;
    for (const listener of this.statusListeners) listener(next);
  }

  private send(payload: Record<string, unknown>) {
    if (this.ws?.readyState !== WS_OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  private sendSubscribe(topic: string) {
    this.send({ type: 'subscribe', topic });
  }

  private restoreSubscriptions() {
    for (const topic of this.subscriptions.keys()) {
      this.sendSubscribe(topic);
    }
  }

  private dispatch(raw: unknown) {
    let message: { topic?: string; payload?: unknown } | null = null;
    try {
      message = typeof raw === 'string' ? JSON.parse(raw) : null;
    } catch {
      logger.warn('realtime', '收到非 JSON 消息');
      return;
    }
    if (!message?.topic) return;

    const subscription = this.subscriptions.get(message.topic);
    if (!subscription) return;

    for (const handler of subscription.handlers) {
      try {
        handler(message.payload, message.topic);
      } catch (error) {
        logger.error('realtime', '消息处理异常', error);
      }
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping', ts: Date.now() });
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.manuallyClosed) return;
    if (this.retries >= this.maxRetries) {
      logger.warn('realtime', `重连达到上限（${this.maxRetries} 次），停止重连`);
      this.setStatus('closed');
      return;
    }

    this.clearReconnectTimer();
    this.retries += 1;
    // 指数退避：1s, 2s, 4s, 8s... 上限 30s
    const delay = Math.min(1000 * 2 ** (this.retries - 1), 30_000);
    this.setStatus('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        /* scheduleReconnect 已在内部处理 */
      });
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private attachAppStateListener() {
    if (this.appStateSubscription) return;
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
  }

  private detachAppStateListener() {
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
  }

  private handleAppStateChange = (next: AppStateStatus) => {
    if (next === 'active') {
      if (!this.manuallyClosed && this.ws?.readyState !== WS_OPEN) {
        this.retries = 0;
        this.connect().catch(() => {});
      }
      return;
    }

    // 进入后台：断开长连接，避免被系统冻结后留下“假在线”状态
    if (next === 'background' || next === 'inactive') {
      this.stopHeartbeat();
      if (this.ws) {
        this.ws.onclose = null;
        this.ws.close();
        this.ws = null;
      }
      this.setStatus('idle');
    }
  };
}

/** 单例：整个应用共享一条连接 */
let singleton: WebSocketRealtimeClient | null = null;

export function getRealtimeClient(options?: RealtimeClientOptions): WebSocketRealtimeClient {
  singleton ??= new WebSocketRealtimeClient(options);
  return singleton;
}
