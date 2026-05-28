import React, { useEffect, useRef } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { MessageBubble } from './MessageBubble';

export const MessageList: React.FC = () => {
  const { activeRoom } = useMessageStore();
  
  const messages = activeRoom && Array.isArray(activeRoom.messages) 
    ? activeRoom.messages 
    : [];

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('💬 MessageList - current activeRoom:', activeRoom);
    console.log('💬 MessageList - rendered messages:', messages);
  }, [activeRoom, messages]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={listRef}
      className="flex-1 w-full overflow-y-auto px-6 py-4 flex flex-col bg-slate-950"
    >
      {/* 메시지 리스트 렌더링 */}
      {messages.map((message, index) => {
        if (!message) return null;
        const msgKey = message.messageId !== undefined && message.messageId !== null 
          ? message.messageId 
          : `fallback-${index}-${message.createdAt || Date.now()}`;
          
        return <MessageBubble key={msgKey} message={message} />;
      })}
      
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm gap-2 py-8">
          <span className="text-2xl">💬</span>
          <span>이 대화방의 첫 메시지를 보내보세요.</span>
        </div>
      )}
    </div>
  );
};


