import type { StatusType } from '../../../lib/types';

export type DashboardAlert = {
  id: string;
  employeeName: string;
  eventType: StatusType;
  eventTime: string;
  confidence: number;
  occurredAtIso: string;
};

interface ManagerAlertLogProps {
  alerts: DashboardAlert[];
  onClearAlerts: () => void;
  isWsConnected: boolean;
}

export default function ManagerAlertLog({ alerts, onClearAlerts, isWsConnected }: ManagerAlertLogProps) {
  return (
    <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isWsConnected ? 'bg-cyan-400' : 'bg-yellow-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isWsConnected ? 'bg-cyan-500' : 'bg-yellow-500'}`}></span>
          </span>
          실시간 상태 변경 로그
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={onClearAlerts}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-0.5 rounded bg-white/5 border border-white/5"
          >
            내역 삭제
          </button>
          <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            수신 {alerts.length}개
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2.5 pr-1">
        {alerts.length === 0 ? (
          <div className="text-center py-12 text-slate-600 text-xs italic">
            수신된 상태 변경 정보가 없습니다.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">{alert.employeeName}</span>
                <span className="text-[9px] text-slate-500 font-mono">{alert.eventTime}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-black text-cyan-400">
                  {alert.eventType === 'WORKING' ? '🟢 근무 중' :
                   alert.eventType === 'MEETING' ? '💬 회의 중' :
                   alert.eventType === 'AWAY' ? '🚶 자리비움' :
                   alert.eventType === 'FOCUS' ? '🎯 집중 근무' : '😴 오프라인'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
