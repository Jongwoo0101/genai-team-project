import React from 'react';
import type { ChatMessageResponse } from '../types';
import { useAuthStore } from '../../auth/stores/authStore';

interface Props {
  message: ChatMessageResponse;
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const { user } = useAuthStore();
  
  if (!message) return null;

  const isMe = Number(message.senderId) === Number(user?.id);
  const isUrgent = message.messageType === 'URGENT';

  const formattedTime = (() => {
    try {
      if (!message.createdAt) return '';
      return new Date(message.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  })();

  return (
    <div className={`flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs text-slate-400 font-semibold">
          {isMe ? '나' : (message.senderUsername || `사용자 ${message.senderId}`)}
        </span>
        <span className="text-[10px] text-slate-500 font-mono">{formattedTime}</span>
      </div>

      <div className="flex items-end gap-2 max-w-[70%]">
        {/* 내가 보낸 메시지 옆에 읽음 여부 표시 */}
        {isMe && (
          <div className="flex flex-col items-end mr-1 text-[9px] font-mono shrink-0 select-none">
            {!message.read ? (
              <span className="text-indigo-400 font-bold">1</span>
            ) : (
              <span className="text-slate-600">읽음</span>
            )}
          </div>
        )}

        {isMe && isUrgent && (
          <span className="text-[9px] text-red-400 bg-red-950/40 border border-red-500/20 px-1.5 py-0.5 rounded font-black shrink-0 animate-pulse">
            🚨 긴급
          </span>
        )}

        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-all ${
            isMe
              ? 'bg-indigo-600 text-white rounded-tr-none'
              : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-850'
          } ${isUrgent ? 'border-red-500/50 bg-red-950/20 text-red-200 font-semibold' : ''}`}
        >
          {message.content || ''}
        </div>

        {!isMe && isUrgent && (
          <span className="text-[9px] text-red-400 bg-red-950/40 border border-red-500/20 px-1.5 py-0.5 rounded font-black shrink-0 animate-pulse">
            🚨 긴급
          </span>
        )}
      </div>
    </div>
  );
};
