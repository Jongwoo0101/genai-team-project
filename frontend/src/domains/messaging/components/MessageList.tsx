import React, { useEffect, useRef } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { MessageBubble } from './MessageBubble';

export const MessageList: React.FC = () => {
  const { messages } = useMessageStore();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={listRef}
      className="absolute inset-0 overflow-y-auto px-6 py-4 flex flex-col"
    >
      {messages.map((message) => (
        <MessageBubble key={message.messageId} message={message} />
      ))}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
          <span>💬</span>
          <span>이 채널의 첫 메시지를 보내보세요.</span>
        </div>
      )}
    </div>
  );
};
