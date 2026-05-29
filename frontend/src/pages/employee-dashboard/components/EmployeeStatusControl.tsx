import { Play } from 'lucide-react';
import type { UserStateType } from '../../../domains/commute/stores/commuteStore';

interface EmployeeStatusControlProps {
  userState: string;
  commuteStatus: string;
  onStateChange: (status: UserStateType) => void;
}

export default function EmployeeStatusControl({
  userState,
  commuteStatus,
  onStateChange
}: EmployeeStatusControlProps) {
  return (
    <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
      <div>
        <span className="text-slate-400 font-semibold flex items-center gap-2 text-sm">
          <Play className="w-4 h-4 text-violet-400" /> 현재 나의 상태 설정
        </span>
        <p className="text-xs text-slate-500 mt-1 mb-6">스스로 상태를 선택하여 팀원들에게 내 상황을 공유하세요.</p>
      </div>

      <div className="space-y-3">
        {(['집중 근무', '회의 중', '자리비움'] as const).map((status) => {
          const isSelected = userState === status;
          const getBtnStyles = () => {
            if (!isSelected) return 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800';
            if (status === '집중 근무') return 'bg-violet-600/10 border-violet-500 text-violet-400 font-bold';
            if (status === '회의 중') return 'bg-amber-600/10 border-amber-500 text-amber-400 font-bold';
            return 'bg-sky-600/10 border-sky-500 text-sky-400 font-bold';
          };

          const getIcon = () => {
            if (status === '집중 근무') return '🎯';
            if (status === '회의 중') return '💬';
            return '🚶';
          };

          return (
            <button
              key={status}
              onClick={() => onStateChange(status)}
              disabled={commuteStatus !== 'WORK'}
              className={`w-full py-3.5 px-4 rounded-xl border text-sm transition duration-200 flex items-center gap-3 cursor-pointer ${getBtnStyles()} disabled:opacity-40 disabled:hover:bg-transparent`}
            >
              <span className="text-lg">{getIcon()}</span>
              <span>{status}</span>
              {isSelected && (
                <span className="ml-auto w-2 h-2 rounded-full bg-current animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
