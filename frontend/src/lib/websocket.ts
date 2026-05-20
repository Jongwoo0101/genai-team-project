import SockJS from 'sockjs-client';
import * as Stomp from 'stompjs';

// Spring Boot 서버가 구동 중인 주소 (v2.0 STOMP 엔드포인트)
const SOCKET_URL = '/ws';

interface SubscriptionDetail {
  stompSubscription: Stomp.Subscription | null;
  callback: (payload: any) => void;
}

class WebSocketService {
  private stompClient: Stomp.Client | null = null;
  private connected = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: Map<string, SubscriptionDetail> = new Map();
  private onConnectStatusChangeCallback?: (isConnected: boolean) => void;

  constructor() {
    // 로컬 Mock 멀티 윈도우/탭 동기화 지원 (Option B)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith('mock_status_broadcast_')) {
          if (event.newValue) {
            try {
              const payload = JSON.parse(event.newValue);
              console.log('[FALLBACK] 로컬 스토리지로부터 상태 업데이트 수신:', payload);
              
              // 등록된 구독자 중 토픽에 적합한 콜백들에 메시지 라우팅
              this.subscriptions.forEach((sub, topic) => {
                // 토픽 패턴 매칭 (예: /topic/team/{managerId} 또는 /topic/members/{memberId})
                if (topic.includes('/topic/team/') || topic.includes('/topic/members/')) {
                  sub.callback(payload);
                }
              });
            } catch (e) {
              console.error('Failed to parse mock broadcast:', e);
            }
          }
        }
      });
    }
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

    // 만약 이미 진행 중인 stompClient가 존재한다면 우선 해제 처리
    if (this.stompClient) {
      this.disconnect();
    }

    const socket = new SockJS(SOCKET_URL);
    const stompClient = Stomp.over(socket);
    stompClient.debug = () => {};
    this.stompClient = stompClient;

    stompClient.connect(
      {},
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

  subscribe(topic: string, callback: (payload: any) => void) {
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
      console.warn(`[FALLBACK] 웹소켓이 연결되지 않았습니다. '${topic}' 로컬 Mock 구독으로 대기합니다.`);
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

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    
    if (this.stompClient) {
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
