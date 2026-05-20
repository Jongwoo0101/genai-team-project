// StatusType 기반 UI 상수 (backend StatusType.java에 맞춤)

// ========================
// 공통 UI 상수 (상태 타입 라벨 및 색상)
// ========================

/** StatusType별 한글 라벨 (backend StatusType.java에 맞춰) */
export const statusTypeLabels: Record<string, string> = {
  WORKING: '근무 중',
  MEETING: '회의 중',
  BREAK: '휴식 중',
  FOCUS: '집중 중',
  OFFLINE: '오프라인',
};

/** StatusType별 색상 클래스 */
export const statusTypeColors: Record<string, { bg: string; text: string; dot: string }> = {
  WORKING: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  MEETING: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  BREAK: { bg: 'bg-sky-500/10', text: 'text-sky-400', dot: 'bg-sky-400' },
  FOCUS: { bg: 'bg-violet-500/10', text: 'text-violet-400', dot: 'bg-violet-400' },
  OFFLINE: { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-600' },
};
