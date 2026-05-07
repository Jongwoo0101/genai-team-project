import type { EventType } from '../lib/types';
import { eventTypeLabels, eventTypeColors } from '../lib/mockData';

interface StatusLogEntry {
  status: EventType;
  time: string;
  confidence: number;
}

interface EmployeeSidebarProps {
  username: string;
  balance: number;
  prevStatus: EventType;
  statusLog: StatusLogEntry[];
  teamName?: string;
  teamCode?: string;
}

export default function EmployeeSidebar({
  username,
  balance,
  prevStatus,
  statusLog,
  teamName,
  teamCode,
}: EmployeeSidebarProps) {
  return (
    <div className="lg:col-span-1 flex flex-col gap-4">
      {/* Profile Card */}
      <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-5">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">내 정보</h3>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-cyan-500/20">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-bold">{username}</p>
            <p className="text-slate-500 text-xs">직원</p>
          </div>
        </div>
        <div className="space-y-2.5">
          <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-500">가상 포인트</span>
            <span className="text-sm font-bold text-cyan-400">💰 {balance.toLocaleString()} P</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-500">이전 상태</span>
            <span className={`text-xs font-bold ${eventTypeColors[prevStatus].text}`}>{eventTypeLabels[prevStatus]}</span>
          </div>
        </div>
      </div>

      {/* Team Info Card */}
      {teamName && (
        <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-5">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">소속 팀</h3>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm">{teamName}</p>
              {teamCode && (
                <p className="text-[10px] text-slate-600 font-mono tracking-wider">코드: {teamCode}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Card */}
      <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-5 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">분석 로그</h3>
          <span className="text-[10px] text-slate-700 font-mono">최근 20건</span>
        </div>

        {statusLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-center opacity-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
              </svg>
            </div>
            <p className="text-xs text-slate-600 text-center">모니터링을 시작하면<br />로그가 기록됩니다</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {statusLog.map((log, i) => {
              const c = eventTypeColors[log.status];
              return (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                    <span className={`text-xs font-bold ${c.text}`}>{eventTypeLabels[log.status]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-[10px] text-slate-700">{log.confidence}%</span>
                    <span className="text-[10px] text-slate-600 font-mono">{log.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
