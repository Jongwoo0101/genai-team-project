import SockJS from 'sockjs-client';
import * as Stomp from 'stompjs';
import { STORAGE_KEYS } from './constants'; // 인증 토큰 키를 가져오기 위해 추가

// Spring Boot 서버가 구동 중인 주소 (v2.0 STOMP 엔드포인트)
const SOCKET_URL = '/ws';

interface SubscriptionDetail {
  stompSubscription: Stomp.Subscription | null;
  callback: (payload: unknown) => void;
}

class WebSocketService {
  private stompClient: Stomp.Client | null = null;
  private connected = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: Map<string, SubscriptionDetail> = new Map();
  private onConnectStatusChangeCallback?: (isConnected: boolean) => void;

  constructor() {
    // 실소켓 환경으로 구동
  }

  connect(
    onConnectStatusChange?: (isConnected: boolean) => void
  ) {
    if (onConnectStatusChange) {
      this.onConnectStatusChangeCallback = onConnectStatusChange;
    }

    if (this.connected) {
      if (onConnectStatusChange) onConnectStatusChange(true);
      return;
    }

    // 기존 stompClient가 존재하고 이미 연결된 상태라면 해제 처리
    if (this.stompClient && this.connected) {
      this.disconnect();
    }

    const socket = new SockJS(SOCKET_URL);
    const stompClient = Stomp.over(socket);
    stompClient.debug = () => {};
    this.stompClient = stompClient;

    // api.ts와 동일하게 sessionStorage에서 토큰을 가져와 헤더 생성
    const token = sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const headers: Record<string, string> = {};
    if (token && token !== 'undefined' && token !== 'null') {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 빈 객체 `{}` 대신 생성한 `headers` 객체를 전달하여 STOMP CONNECT 요청
    stompClient.connect(
      headers,
      () => {
        // 이미 disconnect가 호출되어 stompClient가 다른 인스턴스로 바뀐 경우 취소
        if (this.stompClient !== stompClient) {
          try {
            stompClient.disconnect(() => {});
          } catch { /* ignore */ }
          return;
        }

        this.connected = true;
        if (this.onConnectStatusChangeCallback) {
          this.onConnectStatusChangeCallback(true);
        }
        console.log('WebSocket Connected');

        // 연결 시 기존에 등록해둔 구독 정보 재구독 실행
        this.subscriptions.forEach((sub, topic) => {
          if (sub.stompSubscription) {
            try { sub.stompSubscription.unsubscribe(); } catch { /* ignore */ }
          }
          const stompSub = stompClient.subscribe(topic, (message) => {
            if (message.body) {
              try {
                const data = JSON.parse(message.body);
                sub.callback(data);
              } catch (e) {
                console.error('STOMP 메시지 파싱 에러:', e);
              }
            }
          });
          sub.stompSubscription = stompSub;
        });
      },
      (error) => {
        // 이미 disconnect가 호출되어 stompClient가 다른 인스턴스로 바뀐 경우 무시
        if (this.stompClient !== stompClient) return;

        console.error('WebSocket Connection Error:', error);
        this.connected = false;
        if (this.onConnectStatusChangeCallback) {
          this.onConnectStatusChangeCallback(false);
        }
        this.scheduleReconnect();
      }
    );
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      this.connect();
    }, 2000);
  }

  subscribe(topic: string, callback: (payload: unknown) => void) {
    // 기존에 동일 토픽이 있다면 해제
    this.unsubscribe(topic);

    let stompSub: Stomp.Subscription | null = null;
    if (this.connected && this.stompClient) {
      stompSub = this.stompClient.subscribe(topic, (message) => {
        if (message.body) {
          try {
            const data = JSON.parse(message.body);
            callback(data);
          } catch (e) {
            console.error('STOMP 메시지 파싱 에러:', e);
          }
        }
      });
    } else {
      // 아직 연결되지 않았으므로 구독은 저장만 하고, 연결 시 자동으로 구독됩니다.
    }

    this.subscriptions.set(topic, {
      stompSubscription: stompSub,
      callback
    });
  }

  unsubscribe(topic: string) {
    const sub = this.subscriptions.get(topic);
    if (sub) {
      if (sub.stompSubscription) {
        try {
          sub.stompSubscription.unsubscribe();
        } catch (e) {
          console.error(`Error unsubscribing topic ${topic}:`, e);
        }
      }
      this.subscriptions.delete(topic);
    }
  }

  publish(topic: string, payload: unknown) {
    if (this.connected && this.stompClient) {
      this.stompClient.send(topic, {}, JSON.stringify(payload));
    } else {
      console.warn(`WebSocket이 연결되지 않아 메시지를 보낼 수 없습니다: '${topic}'`);
    }
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    
    if (this.stompClient) {
      // 연결이 아직 확립되지 않았을 경우 stompjs의 disconnect 호출이 InvalidStateError를 발생시킬 수 있음
      if (!this.connected) {
        // 현재 연결 상태가 아니면 client만 초기화하고 종료
        this.stompClient = null;
        return;
      }
      const clientToDisconnect = this.stompClient;
      this.stompClient = null;
      this.connected = false;
      
      try {
        // 기존 STOMP 구독 정리
        this.subscriptions.forEach((sub) => {
          if (sub.stompSubscription) {
            try { sub.stompSubscription.unsubscribe(); } catch { /* ignore */ }
            sub.stompSubscription = null;
          }
        });

        clientToDisconnect.disconnect(() => {
          console.log('WebSocket Disconnected');
          if (this.onConnectStatusChangeCallback) {
            this.onConnectStatusChangeCallback(false);
          }
        });
      } catch (e) {
        console.error('Error during WebSocket disconnect:', e);
        if (this.onConnectStatusChangeCallback) {
          this.onConnectStatusChangeCallback(false);
        }
      }
    } else {
      if (this.onConnectStatusChangeCallback) {
        this.onConnectStatusChangeCallback(false);
      }
    }
  }
}

export const webSocketService = new WebSocketService();