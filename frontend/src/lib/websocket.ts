import SockJS from 'sockjs-client';
import * as Stomp from 'stompjs';
import type { DashboardAlertResponse } from './types';

// Spring Boot 서버가 구동 중인 주소 (프록시 설정에 따라 변경될 수 있음)
const SOCKET_URL = '/ws-monitoring';

class WebSocketService {
  private stompClient: Stomp.Client | null = null;
  private connected = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  connect(onAlertReceived: (alert: DashboardAlertResponse) => void) {
    if (this.connected) return;

    // SockJS를 사용하여 WebSocket 연결 생성
    const socket = new SockJS(SOCKET_URL);
    this.stompClient = Stomp.over(socket);

    // 로그 출력 최소화 (개발 중엔 유지해도 됨)
    this.stompClient.debug = () => {};

    this.stompClient.connect(
      {}, // headers
      () => {
        this.connected = true;
        console.log('WebSocket Connected');

        // /topic/alerts 채널 구독
        this.stompClient?.subscribe('/topic/alerts', (message) => {
          if (message.body) {
            const alertData: DashboardAlertResponse = JSON.parse(message.body);
            onAlertReceived(alertData);
          }
        });
      },
      (error) => {
        console.error('WebSocket Connection Error:', error);
        this.connected = false;
        // 재연결 로직
        this.scheduleReconnect(onAlertReceived);
      }
    );
  }

  private scheduleReconnect(onAlertReceived: (alert: DashboardAlertResponse) => void) {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      this.connect(onAlertReceived);
    }, 5000); // 5초 후 재연결 시도
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.stompClient && this.connected) {
      this.stompClient.disconnect(() => {
        console.log('WebSocket Disconnected');
      });
      this.connected = false;
    }
  }
}

export const webSocketService = new WebSocketService();
