import React from 'react';
import type { ChatRoomDetailResponse, UserStatus } from '../types';
import { Circle } from 'lucide-react';

interface Props {
  room?: ChatRoomDetailResponse;
}

export const MessageHeader: React.FC<Props> = ({ room }) => {
  if (!room) return null;

  const currentStatus = room.otherMemberStatus;

  const getStatusText = (status: UserStatus) => {
    switch (status) {
      case 'WORKING':
        return '근무 중';
      case 'FOCUS':
        return '집중 근무';
      case 'MEETING':
        return '회의 중';
      case 'AWAY':
        return '자리비움';
      default:
        return '오프라인';
    }
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'WORKING':
      case 'FOCUS':
        return 'text-emerald-400 fill-emerald-400';
      case 'MEETING':
        return 'text-amber-400 fill-amber-400';
      case 'AWAY':
        return 'text-cyan-400 fill-cyan-400';
      default:
        return 'text-slate-500 fill-slate-500';
    }
  };

  return (
    <header className="h-16 border-b border-slate-850 px-6 flex items-center justify-between bg-slate-900 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
          {room.otherMemberUsername?.[0] || 'U'}
        </div>
        <div>
          <div className="text-sm font-bold text-slate-100">{room.otherMemberUsername || '사용자'}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Circle className={`w-1.5 h-1.5 ${getStatusColor(currentStatus)}`} />
            <span className="text-[10px] text-slate-400">{getStatusText(currentStatus)}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
