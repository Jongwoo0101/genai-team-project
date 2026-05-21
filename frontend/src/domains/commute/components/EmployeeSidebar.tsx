import type { CommuteLog, UserStateType } from '../stores/commuteStore';
import type { Standup } from '../../standup/stores/standupStore';
import { Clock, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { STATUS_UI_SETTINGS } from '../constants/statusSettings';

interface EmployeeSidebarProps {
  username: string;
  userState: UserStateType;
  commuteStatus: 'NONE' | 'WORK' | 'LEAVE';
  logs: CommuteLog[];
  todayStandup?: Standup;
  teamName?: string;
  teamCode?: string;
}

export default function EmployeeSidebar({
  username,
  userState,
  commuteStatus,
  logs,
  todayStandup,
  teamName,
  teamCode,
}: EmployeeSidebarProps) {
  // 현재 유저의 상태 변경 로그만 필터링
  const myStateLogs = logs.filter(l => l.type === 'STATE' || l.type === 'IN' || l.type === 'OUT').slice(0, 15);

  return (
    <div className="lg:col-span-1 flex flex-col gap-4">
      {/* Profile Card */}
      <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">내 정보</h3>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-500/20">
              {username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-bold">{username}</p>
              <p className="text-slate-500 text-xs">팀원</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_UI_SETTINGS[userState].bgStyle} ${STATUS_UI_SETTINGS[userState].textStyle}`}>
            {STATUS_UI_SETTINGS[userState].icon} {userState}
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-500">출근 상태</span>
            <span className={`text-xs font-bold ${
              commuteStatus === 'WORK' ? 'text-emerald-400' :
              commuteStatus === 'LEAVE' ? 'text-slate-400' : 'text-amber-400'
            }`}>
              {commuteStatus === 'WORK' ? '근무 중' : commuteStatus === 'LEAVE' ? '퇴근 완료' : '출근 전'}
            </span>
          </div>
          
          <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-500">데일리 스탠드업</span>
            {todayStandup ? (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> 제출 완료
              </span>
            ) : (
              <span className="text-xs font-bold text-red-400 flex items-center gap-1 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" /> 미제출
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Team Info Card */}
      {teamName && (
        <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">소속 팀</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm">{teamName}</p>
              {teamCode && (
                <p className="text-[10px] text-slate-500 font-mono tracking-wider">팀 코드: {teamCode}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Card */}
      <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> 내 근태/상태 로그
          </h3>
          <span className="text-[10px] text-slate-600 font-mono">최근 기록</span>
        </div>

        {myStateLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-center opacity-50">
              <BookOpen className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-600 text-center">업무를 시작하면<br />로그가 여기에 기록됩니다.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 flex-1">
            {myStateLogs.map((log) => {
              let detailText = '';
              let dotColor = 'bg-slate-500';
              let textColor = 'text-slate-300';

              if (log.type === 'IN') {
                detailText = '출근 완료';
                dotColor = 'bg-emerald-400';
                textColor = 'text-emerald-400';
              } else if (log.type === 'OUT') {
                detailText = '업무 종료 (퇴근)';
                dotColor = 'bg-slate-400';
                textColor = 'text-slate-400';
              } else if (log.type === 'STATE' && log.statusDetail) {
                detailText = `상태 변경: ${log.statusDetail}`;
                const colors = STATUS_UI_SETTINGS[log.statusDetail as UserStateType];
                if (colors) {
                  dotColor = colors.dotStyle;
                  textColor = colors.textStyle;
                }
              }

              return (
                <div key={log.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                    <span className={`text-xs font-bold ${textColor}`}>{detailText}</span>
                  </div>
                  <span className="text-[9px] text-slate-600 font-mono">{log.timestamp.split(' ').slice(1).join(' ')}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
