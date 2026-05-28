import React from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { webSocketService } from '../../../lib/websocket';
import { AlertTriangle } from 'lucide-react';

interface Props {
  receiverId?: string;
}

export const UrgentAlertButton: React.FC<Props> = ({ receiverId }) => {
  const { activeRoomId } = useMessageStore();

  const handleUrgentAlert = () => {
    if (!receiverId || !activeRoomId) return;

    webSocketService.publish(`/app/messages/${activeRoomId}/urgent`, {
      receiverId,
      content: "🚨 긴급 알림 메시지입니다. 즉시 확인해 주세요!"
    });
    
    alert('상대방에게 긴급 사이렌 경고를 보냈습니다.');
  };

  return (
    <button
      onClick={handleUrgentAlert}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      <span>긴급 사이렌 알림</span>
    </button>
  );
};
