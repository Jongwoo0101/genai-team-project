import type { Team } from '../../../domains/team/stores/teamStore';

interface ManagerStatCardsProps {
  team: Team;
  onlineCount: number;
  workingCount: number;
  meetingCount: number;
  restingCount: number;
}

export default function ManagerStatCards({
  team,
  onlineCount,
  workingCount,
  meetingCount,
  restingCount
}: ManagerStatCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg">
        <p className="text-xs font-bold text-slate-500 uppercase">전체 인원</p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-black text-white">{team.members.length}</span>
          <span className="text-xs text-slate-600">명</span>
        </div>
      </div>
      <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg">
        <p className="text-xs font-bold text-slate-500 uppercase">현재 온라인</p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-black text-emerald-400">{onlineCount}</span>
          <span className="text-xs text-slate-600">명</span>
        </div>
      </div>
      <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg">
        <p className="text-xs font-bold text-slate-500 uppercase">집중 근무 중</p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-black text-violet-400">{workingCount}</span>
          <span className="text-xs text-slate-600">명</span>
        </div>
      </div>
      <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg">
        <p className="text-xs font-bold text-slate-500 uppercase">회의 / 휴식</p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-black text-amber-400">{meetingCount + restingCount}</span>
          <span className="text-xs text-slate-600">명 (회의 {meetingCount} / 자리비움 {restingCount})</span>
        </div>
      </div>
    </div>
  );
}
