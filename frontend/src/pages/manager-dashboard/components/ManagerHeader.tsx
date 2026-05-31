import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Team } from '../../../domains/team/stores/teamStore';

interface ManagerHeaderProps {
  team: Team;
}

export default function ManagerHeader({ team }: ManagerHeaderProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (team?.teamCode) {
      await navigator.clipboard.writeText(team.teamCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/teams')}
          aria-label="팀 목록으로 돌아가기"
          className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer shadow"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight">{team.name} 대시보드</h1>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/15 transition cursor-pointer"
              title="팀 코드 복사"
            >
              <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider">{team.teamCode}</span>
            </button>
            {copied && <span className="text-[10px] text-emerald-400 font-bold animate-fade-in-up">복사됨!</span>}
          </div>
          <p className="text-xs text-slate-500 mt-1">실시간 협업 현황판과 순 근무 인원 분석 차트를 제공합니다.</p>
        </div>
      </div>
    </div>
  );
}
