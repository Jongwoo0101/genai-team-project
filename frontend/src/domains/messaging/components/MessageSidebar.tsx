import React from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { Users, Circle } from 'lucide-react';
import type { UserStatus } from '../types';

export const MessageSidebar: React.FC = () => {
  const { rooms, activeRoomId, setActiveRoomId, receiverStatusMap } = useMessageStore();

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

  return (
    <aside className="w-80 border-r border-slate-850 bg-slate-950 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-slate-850">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span>💬</span> 메시지 채널
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* 팀 메시지 섹션 */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">팀 채널</span>
          </div>
          <div className="space-y-1">
            {rooms.filter(r => r.type === 'TEAM').map(room => (
              <button
                key={room.roomId}
                onClick={() => setActiveRoomId(room.roomId)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  activeRoomId === room.roomId
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="truncate">{room.roomName}</span>
              </button>
            ))}
            {rooms.filter(r => r.type === 'TEAM').length === 0 && (
              <div className="text-xs text-slate-600 px-3 py-2">참여 중인 팀 채널이 없습니다.</div>
            )}
          </div>
        </div>

        {/* 1:1 개인 메시지 섹션 */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">다이렉트 메시지 (DM)</span>
          </div>
          <div className="space-y-1">
            {rooms.filter(r => r.type === 'DM').map(room => {
              const receiver = room.members[0];
              const currentStatus = receiver ? (receiverStatusMap[receiver.id] || receiver.status) : 'OFFLINE';

              return (
                <button
                  key={room.roomId}
                  onClick={() => setActiveRoomId(room.roomId)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition ${
                    activeRoomId === room.roomId
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0">
                      {receiver?.name?.[0] || 'U'}
                    </div>
                    <span className="truncate">{receiver?.name || '알 수 없는 사용자'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <Circle className={`w-2 h-2 ${getStatusColor(currentStatus)}`} />
                    <span className={`text-[10px] ${
                      activeRoomId === room.roomId ? 'text-indigo-200' : 'text-slate-500'
                    }`}>
                      {getStatusText(currentStatus)}
                    </span>
                  </div>
                </button>
              );
            })}
            {rooms.filter(r => r.type === 'DM').length === 0 && (
              <div className="text-xs text-slate-600 px-3 py-2">대화 가능한 팀원이 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
