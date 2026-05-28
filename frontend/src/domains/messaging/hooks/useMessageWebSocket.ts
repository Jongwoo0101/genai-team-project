import { useEffect } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { webSocketService } from '../../../lib/websocket';
import type { Message, UserStatus } from '../types';

interface StatusPayload {
  userId: string;
  status: UserStatus;
}

export const useMessageWebSocket = (roomId: string | null) => {
  const { addMessage, updateUserStatus } = useMessageStore();

  useEffect(() => {
    if (!roomId) return;

    const messageTopic = `/topic/messages/${roomId}`;
    const statusTopic = `/topic/status`;

    // 1. 실시간 메시지 수신 구독
    webSocketService.subscribe(messageTopic, (data: unknown) => {
      const message = data as Message;
      addMessage(message);
    });

    // 2. 실시간 상태 변경 구독
    webSocketService.subscribe(statusTopic, (data: unknown) => {
      const payload = data as StatusPayload;
      updateUserStatus(payload.userId, payload.status);
    });

    return () => {
      webSocketService.unsubscribe(messageTopic);
      webSocketService.unsubscribe(statusTopic);
    };
  }, [roomId, addMessage, updateUserStatus]);
};
