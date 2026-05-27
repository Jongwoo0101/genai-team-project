import type { UserStateType } from '../stores/commuteStore';

export interface StatusUISetting {
  label: UserStateType;
  icon: string;
  textStyle: string;
  bgStyle: string;
  dotStyle: string;
}

export const STATUS_UI_SETTINGS: Record<UserStateType, StatusUISetting> = {
  '근무 중': {
    label: '근무 중',
    icon: '💻',
    textStyle: 'text-emerald-400',
    bgStyle: 'bg-emerald-500/10 border-emerald-500/20',
    dotStyle: 'bg-emerald-400',
  },
  '집중 근무': {
    label: '집중 근무',
    icon: '🎯',
    textStyle: 'text-violet-400',
    bgStyle: 'bg-violet-500/10 border-violet-500/20',
    dotStyle: 'bg-violet-400',
  },
  '회의 중': {
    label: '회의 중',
    icon: '💬',
    textStyle: 'text-amber-400',
    bgStyle: 'bg-amber-500/10 border-amber-500/20',
    dotStyle: 'bg-amber-400',
  },
  '자리비움': {
    label: '자리비움',
    icon: '🚶',
    textStyle: 'text-sky-400',
    bgStyle: 'bg-sky-500/10 border-sky-500/20',
    dotStyle: 'bg-sky-400',
  },
  '오프라인': {
    label: '오프라인',
    icon: '😴',
    textStyle: 'text-slate-400',
    bgStyle: 'bg-slate-800 border-slate-700',
    dotStyle: 'bg-slate-500',
  },
};
