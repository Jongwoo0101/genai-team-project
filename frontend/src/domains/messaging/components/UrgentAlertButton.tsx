import React, { useState } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { sendDirectMessage } from '../api';
import { AlertTriangle } from 'lucide-react';

interface Props {
  receiverId?: number;
}

export const UrgentAlertButton: React.FC<Props> = ({ receiverId }) => {
  const { activeRoomId, addMessage } = useMessageStore();
  const [loading, setLoading] = useState(false);

  const handleUrgentAlert = async () => {
    if (!receiverId || !activeRoomId) return;

    try {
      setLoading(true);
      const content = "🚨 긴급 알림 메시지입니다. 즉시 확인해 주세요!";
      const response = await sendDirectMessage(activeRoomId, content, 'URGENT');
      
      // 내 메시지 화면에 추가
      addMessage(response);
      alert('상대방에게 긴급 사이렌 경고를 보냈습니다.');
    } catch (err) {
      console.error('긴급 알림 발송 실패:', err);
      alert('긴급 알림 발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUrgentAlert}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 disabled:opacity-50"
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      <span>{loading ? '전송 중...' : '긴급 사이렌 알림'}</span>
    </button>
  );
};

