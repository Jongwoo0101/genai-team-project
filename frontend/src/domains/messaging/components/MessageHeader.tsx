import React, { useState, useRef, useEffect } from 'react';
import type { ChatRoomDetailResponse, UserStatus } from '../types';
import { Circle } from 'lucide-react';

interface Props {
  room?: ChatRoomDetailResponse;
}

export const MessageHeader: React.FC<Props> = ({ room }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

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

  const isTeam = !!(room.roomName || room.participants);

  if (isTeam) {
    const participantCount = room.participants?.length || 0;
    return (
      <header className="h-16 border-b border-slate-850 px-6 flex items-center justify-between bg-slate-900 shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            <span>👥</span>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">{room.roomName || '팀 전체 채팅'}</div>
            <div className="relative mt-0.5" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="text-[10px] text-slate-400 hover:text-slate-200 transition underline flex items-center gap-1"
              >
                참여자 {participantCount}명
              </button>
              {dropdownOpen && room.participants && (
                <div className="absolute left-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50">
                  <div className="text-[10px] font-bold text-slate-500 px-2 py-1 uppercase tracking-wider border-b border-slate-800 mb-1">
                    참여자 목록
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {room.participants.map((p) => (
                      <div key={p.memberId} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800 text-xs font-medium text-slate-300">
                        <div className="flex items-center gap-2 truncate">
                          <Circle className={`w-1.5 h-1.5 shrink-0 ${getStatusColor(p.status)}`} />
                          <span className="truncate">{p.username}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 shrink-0 pl-2">
                          {getStatusText(p.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="h-16 border-b border-slate-850 px-6 flex items-center justify-between bg-slate-900 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
          {room.otherMemberUsername?.[0] || 'U'}
        </div>
        <div>
          <div className="text-sm font-bold text-slate-100">{room.otherMemberUsername || '사용자'}</div>
          {currentStatus && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Circle className={`w-1.5 h-1.5 ${getStatusColor(currentStatus)}`} />
              <span className="text-[10px] text-slate-400">{getStatusText(currentStatus)}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

