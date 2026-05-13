import SockJS from 'sockjs-client';
import * as Stomp from 'stompjs';
import type { DashboardAlertResponse } from './types';

// Spring Boot 서버가 구동 중인 주소 (프록시 설정에 따라 변경될 수 있음)
const SOCKET_URL = '/ws-monitoring';

class WebSocketService {
  private stompClient: Stomp.Client | null = null;
  private connected = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  connect(
    onAlertReceived: (alert: DashboardAlertResponse) => void,
    onConnectStatusChange?: (isConnected: boolean) => void
  ) {
    if (this.connected) return;

    const socket = new SockJS(SOCKET_URL);
    this.stompClient = Stomp.over(socket);
    this.stompClient.debug = () => {};

    this.stompClient.connect(
      {},
      () => {
        this.connected = true;
        if (onConnectStatusChange) onConnectStatusChange(true);
        console.log('WebSocket Connected');

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
        if (onConnectStatusChange) onConnectStatusChange(false);
        this.scheduleReconnect(onAlertReceived, onConnectStatusChange);
      }
    );
  }

  private scheduleReconnect(
    onAlertReceived: (alert: DashboardAlertResponse) => void,
    onConnectStatusChange?: (isConnected: boolean) => void
  ) {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      this.connect(onAlertReceived, onConnectStatusChange);
    }, 1500);
  }

  disconnect(onConnectStatusChange?: (isConnected: boolean) => void) {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.stompClient && this.connected) {
      this.stompClient.disconnect(() => {
        console.log('WebSocket Disconnected');
        if (onConnectStatusChange) onConnectStatusChange(false);
      });
      this.connected = false;
    } else {
        if (onConnectStatusChange) onConnectStatusChange(false);
    }
  }
}

export const webSocketService = new WebSocketService();
