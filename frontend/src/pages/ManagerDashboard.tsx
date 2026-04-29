import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  mockMonitoringStatuses,
  mockWorkEvents,
  mockDashboardStats,
  eventTypeLabels,
  eventTypeColors,
} from '../lib/mockData';
import type { WorkEvent, MonitoringStatus, EventType } from '../lib/types';

/** Mock WebSocket 이벤트 시뮬레이션 (파이프라인 4단계) */
const SIMULATED_EVENTS: Omit<WorkEvent, 'id' | 'timestamp'>[] = [
  { memberId: 3, memberName: '박준혁', eventType: 'DROWSINESS', description: '졸음 상태 감지 - 눈 깜빡임 빈도 저하', resolved: false },
  { memberId: 6, memberName: '한승우', eventType: 'PHONE_USE', description: '휴대폰 사용 감지', resolved: false },
  { memberId: 5, memberName: '정다은', eventType: 'ABSENCE', description: '자리 이탈 감지 - 카메라 미감지', resolved: false },
  { memberId: 2, memberName: '이서연', eventType: 'DROWSINESS', description: '졸음 상태 감지 - 머리 기울기 변화', resolved: false },
];

export default function ManagerDashboard() {
  const { user, isAuthenticated } = useAuthStore();
  const [events, setEvents] = useState<WorkEvent[]>(mockWorkEvents);
  const [statuses, setStatuses] = useState<MonitoringStatus[]>(mockMonitoringStatuses);
  const [stats, setStats] = useState(mockDashboardStats);
  const [notification, setNotification] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [eventIdCounter, setEventIdCounter] = useState(100);

  if (!isAuthenticated || user?.role !== 'MANAGER') {
    return <Navigate to="/login" replace />;
  }

  // Mock WebSocket 시뮬레이션 (파이프라인 4단계)
  useEffect(() => {
    if (!wsConnected) return;
    const interval = setInterval(() => {
      const randomEvent = SIMULATED_EVENTS[Math.floor(Math.random() * SIMULATED_EVENTS.length)];
      const newEvent: WorkEvent = {
        ...randomEvent,
        id: eventIdCounter,
        timestamp: new Date().toISOString(),
      };

      setEventIdCounter((c) => c + 1);
      setEvents((prev) => [newEvent, ...prev.slice(0, 29)]);
      setStats((prev) => ({ ...prev, totalAlerts: prev.totalAlerts + 1 }));

      // 알림 표시
      const label = eventTypeLabels[randomEvent.eventType];
      setNotification(`⚠️ ${randomEvent.memberName} - ${label} 감지`);
      setTimeout(() => setNotification(null), 4000);

      // 상태 업데이트
      setStatuses((prev) =>
        prev.map((s) =>
          s.memberId === randomEvent.memberId
            ? { ...s, currentStatus: randomEvent.eventType as EventType, lastChecked: new Date().toISOString() }
            : s
        )
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [wsConnected, eventIdCounter]);

  const resolveEvent = (id: number) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, resolved: true } : e)));
    setStats((prev) => ({ ...prev, resolvedAlerts: prev.resolvedAlerts + 1 }));
  };

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="max-w-7xl mx-auto">
        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-20 right-6 z-50 glass-card glow-amber px-5 py-3 border-amber-500/30 animate-slide-in-right">
            <p className="text-sm text-amber-400 font-medium">{notification}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">관리자 대시보드</h1>
            <p className="text-slate-400">{user.name}님, 전체 근무 현황을 확인하세요.</p>
          </div>
          <button
            onClick={() => setWsConnected(!wsConnected)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              wsConnected
                ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse-dot' : 'bg-slate-500'}`} />
            {wsConnected ? '실시간 연결 중지' : '실시간 연결 시작'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {[
            { label: '전체 직원', value: stats.totalEmployees, color: 'text-blue-400', icon: '👥' },
            { label: '온라인', value: stats.onlineEmployees, color: 'text-emerald-400', icon: '🟢' },
            { label: '총 알림', value: stats.totalAlerts, color: 'text-amber-400', icon: '🔔' },
            { label: '처리 완료', value: stats.resolvedAlerts, color: 'text-cyan-400', icon: '✅' },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
                <span className="text-lg">{stat.icon}</span>
              </div>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Status List */}
          <div className="lg:col-span-1 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <div className="glass-card p-6 h-full">
              <h2 className="text-lg font-semibold text-white mb-5">직원 상태 현황</h2>
              <div className="space-y-3">
                {statuses.map((s) => {
                  const c = eventTypeColors[s.currentStatus];
                  return (
                    <div key={s.memberId} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-xs font-bold">
                            {s.memberName.charAt(0)}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${s.isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{s.memberName}</p>
                          <p className="text-xs text-slate-500">{formatTime(s.lastChecked)}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${c.bg}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                        <span className={`text-xs font-medium ${c.text}`}>{eventTypeLabels[s.currentStatus]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Event Log Table */}
          <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-white">이벤트 로그</h2>
                <span className="text-xs text-slate-500">{events.length}건</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase">시간</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase">직원</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase">유형</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase hidden md:table-cell">설명</th>
                      <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 uppercase">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.slice(0, 15).map((evt) => {
                      const c = eventTypeColors[evt.eventType];
                      return (
                        <tr key={evt.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                          <td className="py-3 px-3 text-xs text-slate-500 font-mono whitespace-nowrap">{formatTime(evt.timestamp)}</td>
                          <td className="py-3 px-3 text-sm text-slate-300">{evt.memberName}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${c.bg} ${c.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                              {eventTypeLabels[evt.eventType]}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-500 max-w-48 truncate hidden md:table-cell">{evt.description}</td>
                          <td className="py-3 px-3 text-right">
                            {evt.resolved ? (
                              <span className="text-xs text-emerald-400">처리됨</span>
                            ) : (
                              <button onClick={() => resolveEvent(evt.id)}
                                className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer bg-transparent border-none font-medium">
                                처리하기
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
