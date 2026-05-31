import { LogIn, LogOut } from 'lucide-react';
import { formatDateTimeKo } from '../../../lib/datetime';

interface EmployeeCommutePanelProps {
  commuteStatus: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
}

export default function EmployeeCommutePanel({
  commuteStatus,
  checkInTime,
  checkOutTime,
  onCheckIn,
  onCheckOut
}: EmployeeCommutePanelProps) {
  return (
    <div className="md:col-span-2 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/20 border border-indigo-500/10 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-slate-400 font-semibold flex items-center gap-2 text-sm">
            <LogIn className="w-4 h-4 text-emerald-400" /> 출퇴근 제어 패널
          </span>
          <p className="text-xs text-slate-500 mt-1">업무 시작을 클릭하면 팀원들에게 온라인으로 표시됩니다.</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold self-start sm:self-auto border ${
          commuteStatus === 'WORK' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          commuteStatus === 'LEAVE' ? 'bg-slate-800 text-slate-400 border-slate-700' :
          'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          {commuteStatus === 'WORK' ? '근무 중' : commuteStatus === 'LEAVE' ? '퇴근 완료' : '출근 전'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 flex flex-col">
          <span className="text-[10px] text-slate-500 font-semibold uppercase">출근 시각 기록</span>
          <span className="text-sm text-slate-200 font-mono mt-1 font-bold">
            {checkInTime ? formatDateTimeKo(checkInTime) : '기록 없음'}
          </span>
        </div>
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 flex flex-col">
          <span className="text-[10px] text-slate-500 font-semibold uppercase">퇴근 시각 기록</span>
          <span className="text-sm text-slate-200 font-mono mt-1 font-bold">
            {checkOutTime ? formatDateTimeKo(checkOutTime) : '기록 없음'}
          </span>
        </div>
      </div>
      
      <div className="flex gap-4">
        <button
          onClick={onCheckIn}
          disabled={commuteStatus === 'WORK'}
          className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 disabled:shadow-none cursor-pointer"
        >
          <LogIn className="w-4 h-4" /> 업무 시작 (출근)
        </button>
        <button
          onClick={onCheckOut}
          disabled={commuteStatus !== 'WORK'}
          className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-red-600/10 disabled:shadow-none cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> 업무 종료 (퇴근)
        </button>
      </div>
    </div>
  );
}
