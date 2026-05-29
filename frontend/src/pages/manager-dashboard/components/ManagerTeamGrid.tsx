import { useState } from 'react';
import { Search, Users, Video, VideoOff } from 'lucide-react';
import type { UserStateType } from '../../../domains/commute/stores/commuteStore';
import { STATUS_UI_SETTINGS } from '../../../domains/commute/constants/statusSettings';
import type { VideoCallRoom } from '../../../domains/video-call/stores/videoCallStore';

export interface MemberStatusUI {
  id: number;
  username: string;
  isOnline: boolean;
  status: UserStateType;
  lastCheckInTime: string;
  lastCheckOutTime: string;
  activeCall: VideoCallRoom | undefined;
}

interface ManagerTeamGridProps {
  user: { id: number; username: string } | null;
  membersStatus: MemberStatusUI[];
  onlineCount: number;
  onJoinCall: (roomId: number) => void;
  onDirectPing: (memberId: number, memberName: string) => void;
}

export default function ManagerTeamGrid({
  user,
  membersStatus,
  onlineCount,
  onJoinCall,
  onDirectPing
}: ManagerTeamGridProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = membersStatus.filter((m) =>
    m.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: UserStateType) => {
    const setting = STATUS_UI_SETTINGS[status] || STATUS_UI_SETTINGS['오프라인'];
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${setting.bgStyle} ${setting.textStyle}`}>
        {setting.icon} {setting.label}
      </span>
    );
  };

  return (
    <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" /> 실시간 협업 보드
        </h3>
        <span className="text-[10px] text-slate-500 font-mono font-bold">{onlineCount}명 근무 중</span>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-600 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="팀원 이름을 검색하세요"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto max-h-[260px] space-y-2.5 pr-1">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-xs">일치하는 팀원이 없습니다.</div>
        ) : (
          filteredMembers.map((m) => (
            <div
              key={m.id}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-850 hover:border-slate-800 transition duration-150 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 font-bold text-xs">
                    {m.username.charAt(0).toUpperCase()}
                  </div>
                  <span className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                    m.isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                  }`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{m.username}</p>
                  <p className="text-[9px] text-slate-600 font-mono mt-0.5">
                    {m.isOnline ? `출근: ${m.lastCheckInTime}` : m.lastCheckOutTime ? `퇴근: ${m.lastCheckOutTime}` : '기록 없음'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {getStatusBadge(m.status)}
                
                {m.isOnline && m.id !== user?.id && (
                  <button
                    onClick={() => onDirectPing(m.id, m.username)}
                    className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition cursor-pointer animate-pulse-subtle"
                    title="디렉토링 경보 전송"
                  >
                    ⚠️
                  </button>
                )}

                {m.isOnline && (
                  m.activeCall ? (
                    <button
                      onClick={() => onJoinCall(m.activeCall!.roomId)}
                      className="p-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition cursor-pointer"
                      title="영상통화 참여하기"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      disabled
                      className="p-1.5 rounded-lg bg-slate-800/40 text-slate-600 border border-slate-850"
                      title="영상통화 미참여 중"
                    >
                      <VideoOff className="w-3.5 h-3.5" />
                    </button>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
