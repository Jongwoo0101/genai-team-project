import { Clock } from 'lucide-react';
import CameraBadge from '../../../components/CameraBadge';

interface EmployeeHeaderProps {
  isCameraActive: boolean;
  currentTime: Date;
}

export default function EmployeeHeader({ isCameraActive, currentTime }: EmployeeHeaderProps) {
  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">나의 워크스페이스</h1>
        <p className="text-slate-500 text-sm mt-1">비대면 근무 상황을 실시간으로 팀원들과 공유하고 온라인으로 협업하세요.</p>
        {isCameraActive && <CameraBadge />}
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2 text-slate-300 text-sm self-start md:self-auto shadow-md">
        <Clock className="w-4 h-4 text-indigo-400" />
        <span className="font-semibold">현재 시각: {currentTime.toLocaleTimeString('ko-KR')}</span>
      </div>
    </div>
  );
}
