import type { MonitoringStatus } from '../lib/types';
import { eventTypeLabels, eventTypeColors } from '../lib/mockData';

interface EmployeeStatusListProps {
  statuses: MonitoringStatus[];
  isLoading: boolean;
  wsConnected: boolean;
}

export default function EmployeeStatusList({ statuses, isLoading, wsConnected }: EmployeeStatusListProps) {
  const fmt = (ts: string) => {
    try { return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
  };

  return (
    <div className="xl:col-span-1 rounded-2xl bg-slate-900/50 border border-white/5 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-white">직원 실시간 상태</h2>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${wsConnected ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-600 bg-slate-800 border-transparent'}`}>
          {wsConnected ? 'LIVE' : 'IDLE'}
        </span>
      </div>
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : statuses.length === 0 ? (
          <div className="py-16 text-center text-slate-600 text-sm">연결된 직원이 없습니다</div>
        ) : statuses.map((s) => {
          const c = eventTypeColors[s.currentStatus];
          return (
            <div key={s.memberId} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white text-xs font-bold">{s.memberName.charAt(0)}</div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${s.isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-cyan-400 transition-colors">{s.memberName}</p>
                  <p className="text-[10px] text-slate-600">{fmt(s.lastChecked)}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg ${c.bg} ${c.text}`}>{eventTypeLabels[s.currentStatus]}</span>
                <span className="text-[10px] text-slate-600 font-mono">{s.confidence}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
