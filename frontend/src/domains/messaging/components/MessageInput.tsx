import React, { useState } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { webSocketService } from '../../../lib/websocket';
import { Send } from 'lucide-react';

interface Props {
  roomId: string;
}

export const MessageInput: React.FC<Props> = ({ roomId }) => {
  const [text, setText] = useState('');
  const { rooms } = useMessageStore();

  const handleSend = () => {
    if (!text.trim()) return;

    // 긴급 명령어 파싱 (/긴급)
    if (text.trim().startsWith('/긴급')) {
      const content = text.replace('/긴급', '').trim();
      const currentRoom = rooms.find(r => r.roomId === roomId);
      const receiver = currentRoom?.members[0];

      if (currentRoom?.type === 'DM' && receiver) {
        webSocketService.publish(`/app/messages/${roomId}/urgent`, {
          receiverId: receiver.id,
          content: content || "🚨 긴급 알림 메시지입니다. 즉시 확인해 주세요!"
        });
        alert('상대방에게 긴급 사이렌 경고를 전송했습니다.');
      } else {
        alert('긴급 알림은 1:1 개인 메시지(DM) 공간에서만 보낼 수 있습니다.');
      }
    } else {
      // 일반 메시지 발송
      webSocketService.publish(`/app/messages/${roomId}`, {
        content: text,
        isUrgent: false
      });
    }

    setText('');
  };

  return (
    <div className="p-4 border-t border-slate-850 bg-slate-900 flex gap-2.5 shrink-0">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="메시지를 입력하세요... (🚨 긴급 사이렌 전송은 '/긴급 [할말]'을 입력하세요)"
        className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition"
      />
      <button
        onClick={handleSend}
        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/15"
      >
        <Send className="w-4 h-4" />
        <span>전송</span>
      </button>
    </div>
  );
};
