import { useState, useEffect, useRef } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTeamStore } from '../store/teamStore';
import * as api from '../lib/api';
import { eventTypeLabels } from '../lib/mockData';
import type { WorkEvent, MonitoringStatus, EventType, DashboardStats } from '../lib/types';
import { webSocketService } from '../lib/websocket';
import DashboardStatCards from '../components/DashboardStatCards';
import EmployeeStatusList from '../components/EmployeeStatusList';
import EventLogTable from '../components/EventLogTable';

export default function ManagerDashboard() {
  const { user, isAuthenticated } = useAuthStore();
  const { getTeamById, removeMember, fetchTeamMembers } = useTeamStore();
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [statuses, setStatuses] = useState<MonitoringStatus[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalEmployees: 0, onlineEmployees: 0, totalAlerts: 0, resolvedAlerts: 0, activeAlerts: 0 });
  const [notification, setNotification] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const alertDedupRef = useRef<Map<string, number>>(new Map());

  const team = teamId ? getTeamById(teamId) : undefined;

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        const [statsData, eventsData] = await Promise.all([api.getDashboardStats(), api.getWorkEvents()]);
        setStats(statsData);
        setEvents(eventsData);

        // 서버에서 실제 팀 멤버 목록 가져오기
        if (user?.id) {
          await fetchTeamMembers(user.id);
        }
      } catch {
        console.warn('백엔드 API 미구현 또는 연결 실패: 시뮬레이션 모드로 전환합니다.');
        // 팀 멤버 수로 통계 표시
        if (team) {
          setStats((prev) => ({ ...prev, totalEmployees: team.members.length }));
        }
      } finally {
        setIsLoading(false);
      }
    });
  }, [fetchTeamMembers, team, user?.id]);

  useEffect(() => {
    if (wsConnected) {
      webSocketService.connect(
        (alert) => {
          const statusTimestamp = alert.detectedAt || alert.eventTime;
          setStatuses((prev) => {
            const nextStatus: MonitoringStatus = {
              memberId: alert.employeeId,
              memberName: alert.employeeName,
              currentStatus: alert.eventType,
              lastChecked: statusTimestamp,
              isOnline: true,
              confidence: alert.confidence ?? 0
            };
            const exists = prev.some((status) => status.memberId === alert.employeeId);
            if (!exists) return [nextStatus, ...prev];
            return prev.map((status) => status.memberId === alert.employeeId ? nextStatus : status);
          });

          const dedupKey = `${alert.employeeId}:${alert.eventType}`;
          const now = Date.now();
          const lastAlertAt = alertDedupRef.current.get(dedupKey);
          if (lastAlertAt && now - lastAlertAt < 5000) {
            return;
          }
          alertDedupRef.current.set(dedupKey, now);

          const newEvent: WorkEvent = {
            id: alert.eventId,
            memberId: alert.employeeId,
            memberName: alert.employeeName,
            eventType: alert.eventType,
            timestamp: alert.eventTime,
            description: `${eventTypeLabels[alert.eventType as EventType]} 감지${alert.confidence != null ? ` - 신뢰도 ${alert.confidence}%` : ''}`,
            resolved: false,
            confidence: alert.confidence,
            source: alert.source
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

  if (!team) {
    return <Navigate to="/teams" replace />;
  }

  const resolveEvent = (id: number) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, resolved: true } : e)));
    setStats((prev) => ({ ...prev, resolvedAlerts: prev.resolvedAlerts + 1 }));
  };

  const toggleWebSocket = () => {
    setWsConnected(!wsConnected);
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(team.teamCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveMember = (memberId: number) => {
    removeMember(team.id, memberId);
    setRemovingMemberId(null);
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
          <div className="flex items-center gap-4">
            {/* 뒤로가기 */}
            <button
              onClick={() => navigate('/teams')}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="팀 목록으로"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{team.name}</h1>
                {/* 팀 코드 배지 */}
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/15 transition-colors cursor-pointer"
                  title="클릭하여 팀 코드 복사"
                >
                  <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider">{team.teamCode}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-500/50">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                {copied && <span className="text-[10px] text-emerald-400 font-bold animate-fade-in-up">복사됨!</span>}
              </div>
              <p className="text-slate-500 text-sm mt-1">
                {team.description || `${user.username}님, 실시간 근무 현황을 모니터링 중입니다.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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

        <DashboardStatCards stats={{ ...stats, totalEmployees: team.members.length }} />

        {/* Team Members Section */}
        <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">팀원 목록</h3>
            <span className="text-[10px] text-slate-700 font-mono">{team.members.length}명</span>
          </div>
          {team.members.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <p className="text-sm text-slate-500">아직 팀원이 없습니다</p>
              <p className="text-xs text-slate-600">팀 코드 <span className="text-cyan-400 font-mono font-bold">{team.teamCode}</span>를 직원에게 공유하세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/10 flex items-center justify-center text-cyan-400 text-xs font-bold">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{member.username}</p>
                      <p className="text-[10px] text-slate-600">
                        {new Date(member.joinedAt).toLocaleDateString('ko-KR')} 합류
                      </p>
                    </div>
                  </div>
                  {/* 멤버 제거 */}
                  {removingMemberId === member.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                      >
                        확인
                      </button>
                      <button
                        onClick={() => setRemovingMemberId(null)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-slate-400 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRemovingMemberId(member.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 transition-all cursor-pointer"
                      title="팀에서 제거"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <EmployeeStatusList statuses={statuses} isLoading={isLoading} wsConnected={wsConnected} />
          <EventLogTable events={events} isLoading={isLoading} onResolveEvent={resolveEvent} />
        </div>
      </div>
    </div>
  );
}
