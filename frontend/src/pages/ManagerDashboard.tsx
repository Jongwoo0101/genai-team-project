import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import * as api from '../lib/api';
import { eventTypeLabels } from '../lib/mockData';
import type { WorkEvent, MonitoringStatus, EventType, DashboardStats } from '../lib/types';
import { webSocketService } from '../lib/websocket';
import DashboardStatCards from '../components/DashboardStatCards';
import EmployeeStatusList from '../components/EmployeeStatusList';
import EventLogTable from '../components/EventLogTable';
import InviteEmployeeModal from '../components/InviteEmployeeModal';

export default function ManagerDashboard() {
  const { user, isAuthenticated } = useAuthStore();
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [statuses] = useState<MonitoringStatus[]>([]); // TODO: update statuses from websocket
  const [stats, setStats] = useState<DashboardStats>({ totalEmployees: 0, onlineEmployees: 0, totalAlerts: 0, resolvedAlerts: 0, activeAlerts: 0 });
  const [notification, setNotification] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (wsConnected) {
      webSocketService.connect(
        (alert) => {
          const newEvent: WorkEvent = {
            id: alert.eventId,
            memberId: alert.employeeId,
            memberName: alert.employeeName,
            eventType: alert.eventType,
            timestamp: alert.eventTime,
            description: '',
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
        },
        (connected) => setWsConnected(connected)
      );
    } else {
      webSocketService.disconnect((connected) => setWsConnected(connected));
    }

    return () => {
      webSocketService.disconnect();
    };
  }, [wsConnected]);

  if (!isAuthenticated || user?.role !== 'MANAGER') {
    return <Navigate to="/login" replace />;
  }

  const resolveEvent = (id: number) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, resolved: true } : e)));
    setStats((prev) => ({ ...prev, resolvedAlerts: prev.resolvedAlerts + 1 }));
  };

  const toggleWebSocket = () => {
    setWsConnected(!wsConnected);
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
              팀원 초대
            </button>
            <button
              onClick={toggleWebSocket}
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
        </div>

        <DashboardStatCards stats={stats} />

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <EmployeeStatusList statuses={statuses} isLoading={isLoading} wsConnected={wsConnected} />
          <EventLogTable events={events} isLoading={isLoading} onResolveEvent={resolveEvent} />
        </div>

        {/* Invite Modal */}
        <InviteEmployeeModal 
          isOpen={isInviteModalOpen} 
          onClose={() => setIsInviteModalOpen(false)} 
          onSuccess={() => fetchData()} 
        />
      </div>
    </div>
  );
}
