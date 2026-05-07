import type { DashboardStats } from '../lib/types';

interface DashboardStatCardsProps {
  stats: DashboardStats;
}

export default function DashboardStatCards({ stats }: DashboardStatCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[
        { label: '전체 직원', value: stats.totalEmployees, color: 'text-blue-400', icon: '👥' },
        { label: '온라인', value: stats.onlineEmployees, color: 'text-emerald-400', icon: '🟢' },
        { label: '미해결 알림', value: stats.totalAlerts - stats.resolvedAlerts, color: 'text-amber-400', icon: '🔔' },
        { label: '처리 완료', value: stats.resolvedAlerts, color: 'text-cyan-400', icon: '✅' },
      ].map((s, i) => (
        <div key={i} className="rounded-2xl p-5 bg-slate-900/50 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{s.label}</span>
            <span className="text-lg">{s.icon}</span>
          </div>
          <span className={`text-3xl font-black ${s.color}`}>{s.value}</span>
          <span className="text-slate-600 text-xs ml-1.5">명/건</span>
        </div>
      ))}
    </div>
  );
}
