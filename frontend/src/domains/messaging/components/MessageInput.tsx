import React, { useState } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { sendDirectMessage, sendTeamMessage } from '../api';
import { Send } from 'lucide-react';

interface Props {
  roomId: number;
}

export const MessageInput: React.FC<Props> = ({ roomId }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { rooms, addMessage } = useMessageStore();

  const currentRoom = rooms.find((r) => Number(r.roomId) === Number(roomId));
  const roomType = currentRoom?.roomType || 'DIRECT';

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    try {
      setSending(true);

      // 긴급 명령어 파싱 (/긴급)
      if (text.trim().startsWith('/긴급')) {
        if (roomType === 'TEAM') {
          alert('팀 채팅에서는 긴급 메시지를 전송할 수 없습니다.');
          setSending(false);
          return;
        }

        const content = text.replace('/긴급', '').trim();

        if (currentRoom) {
          const finalContent = content || "🚨 긴급 알림 메시지입니다. 즉시 확인해 주세요!";
          const response = await sendDirectMessage(roomId, finalContent, 'URGENT');
          addMessage(response);
          alert('상대방에게 긴급 사이렌 경고를 전송했습니다.');
        } else {
          alert('존재하지 않는 대화방입니다.');
        }
      } else {
        // 일반 메시지 발송
        if (roomType === 'TEAM') {
          const response = await sendTeamMessage(roomId, text.trim());
          addMessage(response);
        } else {
          const response = await sendDirectMessage(roomId, text.trim(), 'NORMAL');
          addMessage(response);
        }
      }

      setText('');
    } catch (err) {
      console.error('메시지 전송 실패:', err);
      alert('메시지 전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  const placeholderText = roomType === 'TEAM'
    ? "메시지를 입력하세요..."
    : "메시지를 입력하세요... (🚨 긴급 사이렌 전송은 '/긴급 [할말]'을 입력하세요)";

  return (
    <div className="p-4 border-t border-slate-850 bg-slate-900 flex gap-2.5 shrink-0">
      <input
        type="text"
        value={text}
        disabled={sending}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder={placeholderText}
        className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={sending || !text.trim()}
        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/15 disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        <span>{sending ? '...' : '전송'}</span>
      </button>
    </div>
  );
};

