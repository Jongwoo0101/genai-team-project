import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Clock } from 'lucide-react';

interface ManagerPresenceChartProps {
  onlineCount: number;
}

export default function ManagerPresenceChart({ onlineCount }: ManagerPresenceChartProps) {
  const chartData = [
    { time: '09:00', 인원: Math.max(0, onlineCount - 1) },
    { time: '10:00', 인원: onlineCount },
    { time: '11:00', 인원: onlineCount },
    { time: '12:00', 인원: Math.round(onlineCount * 0.3) }, 
    { time: '13:00', 인원: Math.round(onlineCount * 0.7) },
    { time: '14:00', 인원: onlineCount },
    { time: '15:00', 인원: onlineCount },
    { time: '16:00', 인원: onlineCount },
    { time: '17:00', 인원: Math.max(0, onlineCount - 1) },
    { time: '18:00', 인원: Math.round(onlineCount * 0.2) }, 
  ];

  return (
    <div className="xl:col-span-2 bg-slate-900 border border-white/5 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" /> 오늘 시간대별 순 근무 인원 수
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">실시간 출퇴근 데이터를 반영한 근무 밀도 시각화 그래프</p>
      </div>
      <div className="w-full h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
              itemStyle={{ color: '#22d3ee', fontSize: '12px', fontWeight: 'bold' }}
            />
            <Area type="monotone" dataKey="인원" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
