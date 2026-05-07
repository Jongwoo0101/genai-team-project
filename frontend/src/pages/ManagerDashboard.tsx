import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import * as api from '../lib/api';
import { eventTypeLabels, eventTypeColors } from '../lib/mockData';
import type { WorkEvent, MonitoringStatus, EventType, DashboardStats } from '../lib/types';
import SockJS from 'sockjs-client';
import * as Stomp from 'stompjs';

export default function ManagerDashboard() {
  const { user, isAuthenticated } = useAuthStore();
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [statuses] = useState<MonitoringStatus[]>([]); // TODO: update statuses from websocket
  const [stats, setStats] = useState<DashboardStats>({ totalEmployees: 0, onlineEmployees: 0, totalAlerts: 0, resolvedAlerts: 0, activeAlerts: 0 });
  const [notification, setNotification] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, eventsData] = await Promise.all([api.getDashboardStats(), api.getWorkEvents()]);
        setStats(statsData);
        setEvents(eventsData);
      } catch (err) {
        console.warn('백엔드 API 미구현 또는 연결 실패: 시뮬레이션 모드로 전환합니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const socket = new SockJS('/ws-monitoring');
    const stompClient = Stomp.over(socket);

    stompClient.debug = () => {}; 

    stompClient.connect({}, () => {
      setWsConnected(true);
      stompClient.subscribe('/topic/alerts', (message) => {
        const alert = JSON.parse(message.body);
        const newEvent: WorkEvent = {
          id: alert.eventId,
          memberId: alert.employeeId,
          memberName: alert.employeeName,
          eventType: alert.eventType,
          timestamp: alert.eventTime,
          description: alert.description || '',
          resolved: false
        };

        setEvents((prev) => [newEvent, ...prev.slice(0, 29)]);
        setStats((prev) => ({
          ...prev,
          activeAlerts: prev.activeAlerts + 1,
          totalAlerts: prev.totalAlerts + 1
        }));
        
        setNotification(`${alert.employeeName} - ${eventTypeLabels[alert.eventType as EventType]} 감지!`);
        setTimeout(() => setNotification(null), 4000);
      });
    }, (error) => {
      console.error('웹소켓 연결 실패:', error);
      setWsConnected(false);
    });

    return () => {
      if (stompClient.connected) {
        stompClient.disconnect(() => {});
      }
    };
  }, []);

  if (!isAuthenticated || user?.role !== 'MANAGER') {
    return <Navigate to="/login" replace />;
  }


  const resolveEvent = (id: number) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, resolved: true } : e)));
    setStats((prev) => ({ ...prev, resolvedAlerts: prev.resolvedAlerts + 1 }));
  };

  const fmt = (ts: string) => {
    try { return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-36 pb-12 px-6">
      <div className="max-w-screen-xl mx-auto">

        {/* Toast */}
        {notification && (
          <div className="fixed top-28 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-xl shadow-xl animate-fade-in-up">
            <span className="text-amber-400">⚠️</span>
            <span className="text-sm text-amber-300 font-semibold">{notification}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">관리자 대시보드</h1>
            <p className="text-slate-500 text-sm mt-1">{user.username}님, 실시간 근무 현황을 모니터링 중입니다.</p>
          </div>
          <button
            onClick={() => setWsConnected(!wsConnected)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              wsConnected
                ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-red-400 animate-pulse' : 'bg-white/50'}`} />
            {wsConnected ? '모니터링 중지' : '실시간 시작'}
          </button>
        </div>

        {/* Stat Cards */}
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

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Employee Status */}
          <div className="xl:col-span-1 rounded-2xl bg-slate-900/50 border border-white/5 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">직원 실시간 상태</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${wsConnected ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-600 bg-slate-800 border-transparent'}`}>
                {wsConnected ? 'LIVE' : 'IDLE'}
              </span>
            </div>
            <div className="space-y-2.5">
              {isLoading ? (
                <div className="py-16 flex justify-center">
                  <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                </div>
              ) : statuses.length === 0 ? (
                <div className="py-16 text-center text-slate-600 text-sm">연결된 직원이 없습니다</div>
              ) : statuses.map((s) => {
                const c = eventTypeColors[s.currentStatus];
                return (
                  <div key={s.memberId} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white text-xs font-bold">{s.memberName.charAt(0)}</div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${s.isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-cyan-400 transition-colors">{s.memberName}</p>
                        <p className="text-[10px] text-slate-600">{fmt(s.lastChecked)}</p>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg ${c.bg} ${c.text}`}>{eventTypeLabels[s.currentStatus]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Log */}
          <div className="xl:col-span-2 rounded-2xl bg-slate-900/50 border border-white/5 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white">모니터링 이벤트 로그</h2>
                <p className="text-xs text-slate-600 mt-0.5">AI가 감지한 이상 행동 이벤트</p>
              </div>
              <span className="text-xs font-mono text-slate-600 bg-slate-800/50 px-3 py-1 rounded-lg border border-white/5">{events.length} events</span>
            </div>

            {events.length === 0 && !isLoading ? (
              <div className="py-20 text-center text-slate-600 text-sm">아직 이벤트가 없습니다. 실시간 모니터링을 시작해보세요.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['시간', '직원', '유형', '내용', '처리'].map((h, i) => (
                        <th key={i} className={`pb-3 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider ${i < 4 ? 'text-left' : 'text-right'} ${i === 3 ? 'hidden lg:table-cell' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {events.slice(0, 12).map((evt) => {
                      const c = eventTypeColors[evt.eventType];
                      return (
                        <tr key={evt.id} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-2 text-[11px] text-slate-600 font-mono whitespace-nowrap">{fmt(evt.timestamp)}</td>
                          <td className="py-3 px-2 text-sm font-medium text-slate-300">{evt.memberName}</td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${c.bg} ${c.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
                              {eventTypeLabels[evt.eventType]}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-[11px] text-slate-600 hidden lg:table-cell max-w-[180px]">
                            <span className="line-clamp-1">{evt.description}</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            {evt.resolved ? (
                              <span className="text-emerald-500 text-[11px] font-bold">✓ 완료</span>
                            ) : (
                              <button onClick={() => resolveEvent(evt.id)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/20 transition-all cursor-pointer">확인</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
