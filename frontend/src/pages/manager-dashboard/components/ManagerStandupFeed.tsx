import { BookOpen } from 'lucide-react';
import type { Standup } from '../../../domains/standup/stores/standupStore';

interface ManagerStandupFeedProps {
  todayStandups: Standup[];
  standupFilterDate: string;
  onFilterDateChange: (date: string) => void;
}

export default function ManagerStandupFeed({
  todayStandups,
  standupFilterDate,
  onFilterDateChange
}: ManagerStandupFeedProps) {
  return (
    <div className="lg:col-span-2 bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" /> 팀원 데일리 스탠드업 피드
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">매일 팀원들이 남긴 목표와 결과를 확인하고 공유하는 공간입니다.</p>
        </div>

        <input
          id="standup-filter-date"
          type="date"
          value={standupFilterDate}
          onChange={(e) => onFilterDateChange(e.target.value)}
          className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-semibold focus:outline-none"
          aria-label="팀원 데일리 스탠드업 조회 날짜 선택"
        />
      </div>

      {todayStandups.length === 0 ? (
        <div className="py-12 border border-dashed border-slate-800 rounded-xl text-center">
          <BookOpen className="w-8 h-8 text-slate-700 mx-auto mb-2 opacity-50" />
          <p className="text-xs text-slate-600">해당 날짜에 등록된 팀원의 데일리 스탠드업 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {todayStandups.map((s) => (
            <div key={s.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-850 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-[10px]">
                    {s.employeeName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-slate-200">{s.employeeName}</span>
                </div>
                <span className="text-[10px] text-slate-600 font-mono">{s.timestampDisplay}</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider block">🎯 오늘의 목표</span>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">{s.todayGoal}</p>
                </div>
                {s.todayResult && (
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">✓ 완료한 결과</span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">{s.todayResult}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
