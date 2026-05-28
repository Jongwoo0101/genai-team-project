import React from 'react';
import type { Message } from '../types';
import { useAuthStore } from '../../auth/stores/authStore';

interface Props {
  message: Message;
}

export const MessageBubble: React.FC<Props> = ({ message }) => {
  const { user } = useAuthStore();
  const currentUserIdStr = user ? String(user.id) : '';
  const isMe = message.senderId === currentUserIdStr;

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs text-slate-400 font-medium">
          {isMe ? '나' : `사용자 ${message.senderId}`}
        </span>
        <span className="text-[10px] text-slate-500 font-mono">{formattedTime}</span>
      </div>

      <div className="flex items-end gap-2 max-w-[70%]">
        {isMe && message.isUrgent && (
          <span className="text-[10px] text-red-400 bg-red-950/40 border border-red-500/20 px-1.5 py-0.5 rounded font-bold shrink-0">
            🚨 긴급
          </span>
        )}

        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isMe
              ? 'bg-indigo-600 text-white rounded-tr-none'
              : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-850'
          } ${message.isUrgent ? 'border-red-500/50 bg-red-950/20 text-red-200' : ''}`}
        >
          {message.content}
        </div>

        {!isMe && message.isUrgent && (
          <span className="text-[10px] text-red-400 bg-red-950/40 border border-red-500/20 px-1.5 py-0.5 rounded font-bold shrink-0">
            🚨 긴급
          </span>
        )}
      </div>
    </div>
  );
};
