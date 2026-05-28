import React from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { useMessageWebSocket } from '../hooks/useMessageWebSocket';
import { MessageHeader } from './MessageHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { StatusAlertBanner } from './StatusAlertBanner';

export const MessageRoom: React.FC = () => {
  const { activeRoomId, rooms } = useMessageStore();
  
  // 웹소켓을 통한 실시간 메시지 및 상대방 상태 변경 구독
  useMessageWebSocket(activeRoomId);

  if (!activeRoomId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500 gap-2">
        <span className="text-3xl">✉️</span>
        <span className="text-sm">대화할 채널이나 팀원을 선택해 주세요.</span>
      </div>
    );
  }

  const currentRoom = rooms.find((r) => r.roomId === activeRoomId);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950">
      <MessageHeader room={currentRoom} />
      <StatusAlertBanner room={currentRoom} />
      <div className="flex-1 overflow-hidden relative">
        <MessageList />
      </div>
      <MessageInput roomId={activeRoomId} />
    </div>
  );
};
