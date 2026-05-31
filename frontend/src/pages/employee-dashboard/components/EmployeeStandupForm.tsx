import React from 'react';
import { BookOpen, Send } from 'lucide-react';

interface EmployeeStandupFormProps {
  todayGoal: string;
  setTodayGoal: (val: string) => void;
  todayResult: string;
  setTodayResult: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  commuteStatus: string;
  hasTodayStandup: boolean;
}

export default function EmployeeStandupForm({
  todayGoal,
  setTodayGoal,
  todayResult,
  setTodayResult,
  onSubmit,
  commuteStatus,
  hasTodayStandup
}: EmployeeStandupFormProps) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-white/5 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-300 font-semibold flex items-center gap-2 text-sm">
          <BookOpen className="w-4 h-4 text-cyan-400" /> 데일리 스탠드업 (오늘의 업무 계획/결과)
        </span>
        {hasTodayStandup && (
          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
            오늘 등록 완료
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-6">매일 하루의 목표와 완료된 결과를 입력해 팀원들과 협업 대시보드에 공유하세요.</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="goal" className="block text-xs font-semibold text-slate-400 mb-1.5">오늘의 목표 (출근 시 필수)</label>
          <textarea
            id="goal"
            rows={2}
            value={todayGoal}
            onChange={(e) => setTodayGoal(e.target.value)}
            disabled={commuteStatus !== 'WORK'}
            placeholder="예: 오늘 신규 대시보드 UI 연동 완료 및 Recharts 차트 검증 진행"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition duration-200 resize-none disabled:opacity-40"
          />
        </div>
        <div>
          <label htmlFor="result" className="block text-xs font-semibold text-slate-400 mb-1.5">오늘 완료한 결과 / 진행 현황 (퇴근 전 권장)</label>
          <textarea
            id="result"
            rows={2}
            value={todayResult}
            onChange={(e) => setTodayResult(e.target.value)}
            disabled={commuteStatus !== 'WORK'}
            placeholder="예: 1. Recharts를 이용한 순 인원 차트 렌더링 완료  2. WebRTC 비디오 스트림 가상 연결 테스트 성공"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition duration-200 resize-none disabled:opacity-40"
          />
        </div>
        <button
          type="submit"
          disabled={commuteStatus !== 'WORK' || !todayGoal.trim()}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span>스탠드업 {hasTodayStandup ? '수정/갱신하기' : '공유하기'}</span>
        </button>
      </form>
    </div>
  );
}
