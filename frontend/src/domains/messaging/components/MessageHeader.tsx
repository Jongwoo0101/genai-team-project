import React from 'react';
import type { ChatRoom, UserStatus } from '../types';
import { useMessageStore } from '../stores/useMessageStore';
import { Circle } from 'lucide-react';

interface Props {
  room?: ChatRoom;
}

export const MessageHeader: React.FC<Props> = ({ room }) => {
  const { receiverStatusMap } = useMessageStore();

  if (!room) return null;

  const isDM = room.type === 'DM';
  const receiver = isDM ? room.members[0] : null;
  const currentStatus = receiver ? (receiverStatusMap[receiver.id] || receiver.status) : 'OFFLINE';

  const getStatusText = (status: UserStatus) => {
    switch (status) {
      case 'WORKING':
        return '근무 중';
      case 'MEETING':
        return '회의 중';
      case 'RESTING':
        return '휴식 중';
      default:
        return '오프라인';
    }
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'WORKING':
        return 'text-emerald-400 fill-emerald-400';
      case 'MEETING':
        return 'text-amber-400 fill-amber-400';
      case 'RESTING':
        return 'text-cyan-400 fill-cyan-400';
      default:
        return 'text-slate-500 fill-slate-500';
    }
  };

  return (
    <header className="h-16 border-b border-slate-850 px-6 flex items-center justify-between bg-slate-900 shrink-0">
      <div className="flex items-center gap-3">
        {isDM ? (
          <>
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {receiver?.name?.[0] || 'U'}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-100">{receiver?.name || '사용자'}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Circle className={`w-1.5 h-1.5 ${getStatusColor(currentStatus)}`} />
                <span className="text-[10px] text-slate-400">{getStatusText(currentStatus)}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 font-bold text-sm">
              #
            </div>
            <div>
              <div className="text-sm font-bold text-slate-100">{room.roomName}</div>
              <div className="text-[10px] text-slate-400">팀 전체 공용 채널</div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
