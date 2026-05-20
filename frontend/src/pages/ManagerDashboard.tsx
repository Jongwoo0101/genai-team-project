import { useState, useEffect, useRef } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTeamStore } from '../store/teamStore';
import { useCommuteStore } from '../store/commuteStore';
import { useAwayStore } from '../store/awayStore';
import * as api from '../lib/api';
import { eventTypeLabels } from '../lib/mockData';
import type { WorkEvent, MonitoringStatus, EventType, DashboardStats } from '../lib/types';
import { webSocketService } from '../lib/websocket';
import DashboardStatCards from '../components/DashboardStatCards';
import EmployeeStatusList from '../components/EmployeeStatusList';
import EventLogTable from '../components/EventLogTable';
import { Calendar, Clock } from 'lucide-react';

export default function ManagerDashboard() {
  const { user, isAuthenticated } = useAuthStore();
  const { getTeamById, removeMember, fetchTeamMembers } = useTeamStore();
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const { commuteStatus: localCommuteStatus, logs: localCommuteLogs } = useCommuteStore();
  const { isAway: localIsAway, logs: localAwayLogs } = useAwayStore();

  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [statuses, setStatuses] = useState<MonitoringStatus[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalEmployees: 0, onlineEmployees: 0, totalAlerts: 0, resolvedAlerts: 0, activeAlerts: 0 });
  const [notification, setNotification] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const alertDedupRef = useRef<Map<string, number>>(new Map());

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [logFilter, setLogFilter] = useState<'ALL' | 'YESTERDAY' | 'TODAY'>('ALL');

  const team = teamId ? getTeamById(teamId) : undefined;

  const getYesterdayDateString = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };
  const yesterdayStr = getYesterdayDateString();
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        const [statsData, eventsData] = await Promise.all([api.getDashboardStats(), api.getWorkEvents()]);
        setStats(statsData);
        setEvents(eventsData);

        if (user?.id) {
          await fetchTeamMembers(user.id);
        }
      } catch {
        console.warn('백엔드 API 미구현 또는 연결 실패: 시뮬레이션 모드로 전환합니다.');
        if (team) {
          setStats((prev) => ({ ...prev, totalEmployees: team?.members?.length || 0 }));
        }
      } finally {
        setIsLoading(false);
      }
    });
  }, [fetchTeamMembers, team, user?.id]);

  // 렌더링 시점에 실시간 WebSocket 상태와 로컬 스토어 데이터를 결합합니다.
  const getDerivedStatuses = () => {
    if (!team) return statuses;

    const employeeName = "test1";
    const employeeMember = team?.members?.find(m => m.username === employeeName);
    if (!employeeMember) return statuses;

    const employeeId = employeeMember.id;
    const isOnline = localCommuteStatus === 'WORK';
    let currentStatus: EventType = 'NORMAL';
    
    if (!isOnline) {
      currentStatus = 'NORMAL';
    } else if (localIsAway) {
      currentStatus = 'AWAY';
    }

    const localStatus: MonitoringStatus = {
      memberId: employeeId,
      memberName: employeeName,
      currentStatus: currentStatus,
      lastChecked: new Date().toLocaleTimeString('ko-KR'),
      isOnline: isOnline,
      confidence: localIsAway ? 100 : 95
    };

    const exists = statuses.some(s => s.memberId === employeeId);
    if (!exists) {
      return [localStatus, ...statuses];
    }
    return statuses.map(s => s.memberId === employeeId ? localStatus : s);
  };

  const derivedStatuses = getDerivedStatuses();

  // 대시보드 통계 카드 합산 파생
  const getDerivedStats = (): DashboardStats => {
    const localOnlineCount = localCommuteStatus === 'WORK' ? 1 : 0;
    const isLongAway = localIsAway && localAwayLogs[0] && (now - localAwayLogs[0].startTimeMs >= 15 * 60 * 1000);
    const activeAlertBonus = isLongAway ? 1 : 0;

    return {
      totalEmployees: team?.members.length || stats.totalEmployees,
      onlineEmployees: stats.onlineEmployees + localOnlineCount,
      totalAlerts: stats.totalAlerts + activeAlertBonus,
      resolvedAlerts: stats.resolvedAlerts,
      activeAlerts: stats.activeAlerts + activeAlertBonus
    };
  };

  const derivedStats = getDerivedStats();

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
          if (lastAlertAt && now - lastAlertAt < 5000) return;
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
          setNotification(`${alert.employeeName} - ${eventTypeLabels[alert.eventType as EventType]} 감지!`);
          setTimeout(() => setNotification(null), 4000);
        },
        (connected) => setWsConnected(connected)
      );
    } else {
      webSocketService.disconnect((connected) => setWsConnected(connected));
    }
    return () => { webSocketService.disconnect(); };
  }, [wsConnected]);

  if (!isAuthenticated || user?.role !== 'MANAGER') return <Navigate to="/login" replace />;
  if (!team) return <Navigate to="/teams" replace />;

  const resolveEvent = (id: number) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, resolved: true } : e)));
    setStats((prev) => ({ ...prev, resolvedAlerts: prev.resolvedAlerts + 1 }));
  };

  const toggleWebSocket = () => setWsConnected(!wsConnected);
  const handleCopyCode = async () => {
    if (team?.teamCode) {
      await navigator.clipboard.writeText(team.teamCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const handleRemoveMember = (memberId: number) => {
    if (team?.id) {
      removeMember(team.id, memberId);
      setRemovingMemberId(null);
    }
  };

  const getCombinedHistory = () => {
    const combined: { id: string; employeeName: string; type: '출근' | '퇴근' | '자리비움'; detail: string; time: string; dateStr: string; }[] = [];
    localCommuteLogs.forEach(c => {
      combined.push({ id: c.id, employeeName: c.employeeName, type: c.type === 'IN' ? '출근' : '퇴근', detail: c.type === 'IN' ? '정상 출근 완료' : '업무 종료 퇴근', time: c.timestamp, dateStr: c.dateStr });
    });
    localAwayLogs.forEach(a => {
      combined.push({ id: a.id, employeeName: a.employeeName, type: '자리비움', detail: `${a.reason} (${a.durationMinutes ? `${a.durationMinutes}분 소요` : '진행 중'})`, time: a.startTime, dateStr: a.dateStr });
    });
    return combined
      .filter(item => {
        if (logFilter === 'YESTERDAY') return item.dateStr === yesterdayStr;
        if (logFilter === 'TODAY') return item.dateStr === todayStr;
        return true;
      })
      .sort((a, b) => b.time.localeCompare(a.time));
  };

  const historyLogs = getCombinedHistory();

  return (
    <div className="min-h-screen bg-slate-950 pt-36 pb-12 px-6">
      <div className="max-w-screen-xl mx-auto">
        {notification && (
          <div className="fixed top-28 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-xl shadow-xl animate-fade-in-up">
            <span className="text-amber-400">⚠️</span>
            <span className="text-sm text-amber-300 font-semibold">{notification}</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/teams')} aria-label="팀 목록으로 돌아가기" className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{team?.name}</h1>
                <button onClick={handleCopyCode} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/15 transition-colors cursor-pointer">
                  <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider">{team?.teamCode}</span>
                </button>
                {copied && <span className="text-[10px] text-emerald-400 font-bold animate-fade-in-up">복사됨!</span>}
              </div>
            </div>
          </div>
          <button onClick={toggleWebSocket} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${wsConnected ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'}`}>
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-red-400 animate-pulse' : 'bg-white/50'}`} />
            {wsConnected ? '모니터링 중지' : '실시간 시작'}
          </button>
        </div>
        <DashboardStatCards stats={derivedStats} />
        <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">팀원 목록</h3>
            <span className="text-[10px] text-slate-700 font-mono">{team?.members?.length || 0}명</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {team?.members?.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 group">
                <p className="text-sm font-bold text-white">{member.username}</p>
                {removingMemberId === member.id ? (
                  <div className="flex items-center gap-1.5">
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
                    className="text-slate-600 hover:text-red-400 transition-colors cursor-pointer"
                    title="팀에서 제거"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <EmployeeStatusList statuses={derivedStatuses} isLoading={isLoading} wsConnected={wsConnected} />
          <EventLogTable events={events} isLoading={isLoading} onResolveEvent={resolveEvent} />
        </div>
        <div className="rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/5 p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">직원 근태 관리 기록 조회</h3>
            </div>
            <div className="flex bg-slate-950/60 p-1 rounded-lg border border-slate-800">
              {(['ALL', 'YESTERDAY', 'TODAY'] as const).map((f) => (
                <button key={f} onClick={() => setLogFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${logFilter === f ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                  {f === 'ALL' ? '전체' : f === 'YESTERDAY' ? '어제' : '오늘'}
                </button>
              ))}
            </div>
          </div>
          {historyLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500"><Clock className="mx-auto mb-2 opacity-50" /> 기록 없음</div>
          ) : (
            <table className="w-full text-left">
              <thead><tr className="text-slate-500 text-xs"><th>직원</th><th>날짜</th><th>구분</th><th>상세</th><th>시각</th></tr></thead>
              <tbody>
                {historyLogs.map((log) => (
                  <tr key={log.id} className="text-sm border-t border-slate-800 hover:bg-white/[0.01]">
                    <td className="py-3 font-semibold text-slate-200">{log.employeeName}</td>
                    <td className="py-3 text-slate-400 font-mono text-xs">{log.dateStr}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.type === '출근' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        log.type === '퇴근' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">{log.detail}</td>
                    <td className="py-3 text-slate-400 font-mono text-xs">{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
