import { UserCheck, User } from 'lucide-react';
import type { Team } from '../../../domains/team/stores/teamStore';

interface ManagerTeamListProps {
  team: Team;
}

export default function ManagerTeamList({ team }: ManagerTeamListProps) {
  return (
    <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl">
      <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 mb-4">
        <UserCheck className="w-4 h-4 text-cyan-400" /> 팀 구성원 목록
      </h3>
      <p className="text-xs text-slate-500 mb-6">현재 소속된 팀원의 목록입니다.</p>

      <div className="space-y-2">
        {team.members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-850 group">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-xs font-semibold text-slate-300">{member.username}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
