import type { WorkEvent } from '../lib/types';
import { statusTypeLabels, statusTypeColors } from '../lib/mockData';

interface EventLogTableProps {
  events: WorkEvent[];
  isLoading: boolean;
  onResolveEvent: (id: number) => void;
}

export default function EventLogTable({ events, isLoading, onResolveEvent }: EventLogTableProps) {
  const fmt = (ts: string) => {
    try { return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
  };

  return (
    <div className="xl:col-span-2 rounded-2xl bg-slate-900/50 border border-white/5 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-white">모니터링 이벤트 로그</h2>
          <p className="text-xs text-slate-600 mt-0.5">AI가 감지한 상태 변경 이벤트</p>
        </div>
        <span className="text-xs font-mono text-slate-600 bg-slate-800/50 px-3 py-1 rounded-lg border border-white/5">{events.length} events</span>
      </div>

      {events.length === 0 && !isLoading ? (
        <div className="py-20 text-center text-slate-600 text-sm">아직 이벤트가 없습니다. 실시간 모니터링을 시작해보세요.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['시간', '직원', '유형', '신뢰도', '내용', '처리'].map((h, i) => (
                  <th key={i} className={`pb-3 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider ${i < 5 ? 'text-left' : 'text-right'} ${i === 4 ? 'hidden lg:table-cell' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {events.slice(0, 12).map((evt) => {
                const c = statusTypeColors[evt.statusType] ?? statusTypeColors['WORKING'];
                return (
                  <tr key={evt.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-2 text-[11px] text-slate-600 font-mono whitespace-nowrap">{fmt(evt.timestamp)}</td>
                    <td className="py-3 px-2 text-sm font-medium text-slate-300">{evt.memberName}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${c.bg} ${c.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
                        {statusTypeLabels[evt.statusType] ?? evt.statusType}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[11px] text-slate-500 font-mono whitespace-nowrap">
                      {evt.confidence != null ? `${evt.confidence}%` : '-'}
                    </td>
                    <td className="py-3 px-2 text-[11px] text-slate-600 hidden lg:table-cell max-w-[180px]">
                      <span className="line-clamp-1">{evt.description}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      {evt.resolved ? (
                        <span className="text-emerald-500 text-[11px] font-bold">✓ 완료</span>
                      ) : (
                        <button onClick={() => onResolveEvent(evt.id)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 transition-all cursor-pointer">확인</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
