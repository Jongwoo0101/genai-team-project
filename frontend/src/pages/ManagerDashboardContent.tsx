import { useState, useEffect } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../domains/auth/stores/authStore';
import { useTeamStore } from '../domains/team/stores/teamStore';
import { useCommuteStore, mapEnStatusToKoState } from '../domains/commute/stores/commuteStore';
import type { UserStateType } from '../domains/commute/stores/commuteStore';
import { STATUS_UI_SETTINGS } from '../domains/commute/constants/statusSettings';
import { WEBSOCKET_TOPICS } from '../lib/constants';
import { useStandupStore } from '../domains/standup/stores/standupStore';
import { useVideoCallStore } from '../domains/video-call/stores/videoCallStore';
import MeetingRoomModalHost from './meetingroom/MeetingRoomModalHost';
import { useMeetingRoomController } from './meetingroom/useMeetingRoomController';
import { webSocketService } from '../lib/websocket';
import type { StatusType } from '../lib/types';
import * as api from '../lib/api';
import { formatTimeKo } from '../lib/datetime';
import { parseWsEnvelope } from '../lib/wsEvent';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Clock,
  Video,
  Users,
  Search,
  BookOpen,
  ArrowLeft,
  VideoOff,
  UserCheck,
  User
} from 'lucide-react';

export default function ManagerDashboard() {
  const { user, isAuthenticated } = useAuthStore();
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const fetchTeamMembers = useTeamStore((s) => s.fetchTeamMembers);
  const syncTeamContext = useTeamStore((s) => s.syncMemberContext);
  const team = useTeamStore((s) => teamId ? s.teams.find((t) => t.id === teamId) : undefined);

  // Zustand 스토어들 연동
  const { 
    commuteStatus: localCommuteStatus, 
    userState: localUserState, 
    logs: localCommuteLogs,
    sendDirectPing 
  } = useCommuteStore();
  const { standups, loadTeamStandups, syncMemberContext: syncStandupContext } = useStandupStore();
  const { handleWebsocketEvent: handleVideoCallWS } = useVideoCallStore();
  const {
    rooms,
    activeRoom,
    isVideoModalOpen,
    setIsVideoModalOpen,
    openJoinedRoom,
  } = useMeetingRoomController({ user });

  const [copied, setCopied] = useState(false);
  
  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [standupFilterDate, setStandupFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // 실시간 알림 수신 상태
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [memberStatuses, setMemberStatuses] = useState<Record<number, StatusType>>({});
  const [isWsConnected, setIsWsConnected] = useState(false);

  // 디렉토링 경고 작성 상태
  const [pingTarget, setPingTarget] = useState<{ id: number; name: string } | null>(null);
  const [pingMessage, setPingMessage] = useState('');

  // team is now reactively derived from Zustand selector above

  useEffect(() => {
    if (user?.id) {
      syncTeamContext(user.id);
      syncStandupContext(user.id);
      void fetchTeamMembers(user.id);
      void loadTeamStandups(standupFilterDate);
    }
  }, [fetchTeamMembers, user?.id, loadTeamStandups, standupFilterDate, syncTeamContext, syncStandupContext]);

  // 실시간 상태 데이터 조회 및 실시간 웹소켓 구독
  useEffect(() => {
    if (!user || !teamId) return;

    // 1. 초기 실시간 상태 데이터 로드
    api.getTeamMemberStatuses(user.id)
      .then((statuses) => {
        const statusMap: Record<number, StatusType> = {};
        statuses.forEach((s) => {
          statusMap[s.memberId] = s.statusType;
        });
        setMemberStatuses(statusMap);
      })
      .catch((err) => {
        console.error('팀원 실시간 상태 로드 실패:', err);
      });

    // 2. 웹소켓 연결
    webSocketService.connect((connected) => {
      setIsWsConnected(connected);
    });

    // 3. 토픽 구독 (/topic/team/{managerId})
    const topic = WEBSOCKET_TOPICS.TEAM(user.id);
    webSocketService.subscribe(topic, (payload) => {
      const envelope = parseWsEnvelope(payload);
      if (!envelope) return;
      const { event, data, occurredAt } = envelope;

      if (event) {
        handleVideoCallWS(envelope);
        useStandupStore.getState().handleWebsocketEvent(envelope);
      }

      const memberId = typeof data.memberId === 'number' ? data.memberId : null;
      const statusType = typeof data.statusType === 'string' ? data.statusType as StatusType : null;
      const username = typeof data.username === 'string' ? data.username : null;
      if (memberId && statusType && username) {
        // 상태 갱신
        setMemberStatuses((prev) => ({
          ...prev,
          [memberId]: statusType
        }));

        // 알림 로그에 적재
        const logMsg: DashboardAlert = {
          id: `log-${Date.now()}-${Math.random()}`,
          employeeName: username,
          eventType: statusType,
          eventTime: formatTimeKo(occurredAt),
          confidence: 1.0,
          occurredAtIso: occurredAt,
        };
        setAlerts((prev) => [logMsg, ...prev].slice(0, 50));
      }
    });

    // 4. 개인 채널 구독 (/topic/members/{userId})
    const memberTopic = WEBSOCKET_TOPICS.MEMBER(user.id);
    webSocketService.subscribe(memberTopic, (msg) => {
      const envelope = parseWsEnvelope(msg);
      if (envelope?.event) {
        handleVideoCallWS(envelope);
      }
    });

    return () => {
      webSocketService.unsubscribe(topic);
      webSocketService.unsubscribe(memberTopic);
      webSocketService.disconnect();
    };
  }, [user, teamId]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!team) return <Navigate to="/teams" replace />;

  const handleCopyCode = async () => {
    if (team?.teamCode) {
      await navigator.clipboard.writeText(team.teamCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 영상통화 빠른 참여
  const handleJoinCall = async (roomId: number) => {
    if (user) {
      await openJoinedRoom(roomId);
    }
  };

  // 1. 팀원들의 실시간 상태 파생 데이터 생성
  // - 로컬스토리지 및 commuteStore에서 수집된 각 팀원의 최신 상태 결합
  const getTeamMembersStatus = () => {
    return team.members.map((m) => {
      // 1-1. 특정 팀원의 마지막 출퇴근 및 상태 정보 찾기
      const memberLogs = localCommuteLogs.filter((l) => l.employeeId === m.id);
      
      let isOnline = false;
      let status: UserStateType = '오프라인';
      let lastCheckInTime = '';
      let lastCheckOutTime = '';

      if (memberLogs.length > 0) {
        // 시간순 정렬 (최신순)
        const sorted = [...memberLogs].sort((a, b) => b.epochMs - a.epochMs);
        
        // 마지막 출퇴근 기록
        const lastIn = sorted.find((l) => l.type === 'IN');
        const lastOut = sorted.find((l) => l.type === 'OUT');
        
        lastCheckInTime = lastIn ? formatTimeKo(lastIn.timestampIso) : '';
        lastCheckOutTime = lastOut ? formatTimeKo(lastOut.timestampIso) : '';
      }

      // API/웹소켓 상태가 있으면 우선 적용
      if (memberStatuses[m.id]) {
        const enStatus = memberStatuses[m.id];
        status = mapEnStatusToKoState(enStatus);
        isOnline = enStatus !== 'OFFLINE';
      } else {
        // Fallback: 로컬 로그 기준
        if (memberLogs.length > 0) {
          const sorted = [...memberLogs].sort((a, b) => b.epochMs - a.epochMs);
          const lastIn = sorted.find((l) => l.type === 'IN');
          const lastOut = sorted.find((l) => l.type === 'OUT');
          if (lastIn && (!lastOut || lastIn.epochMs > lastOut.epochMs)) {
            isOnline = true;
            const lastStateLog = sorted.find((l) => l.type === 'STATE');
            status = lastStateLog && lastStateLog.statusDetail ? (lastStateLog.statusDetail as UserStateType) : '근무 중';
          }
        }
      }

      // 1-2. 현재 유저(대시보드를 보고 있는 직원/관리자) 본인의 상태 추가 보정
      if (m.id === user?.id) {
        isOnline = localCommuteStatus === 'WORK';
        status = isOnline ? localUserState : '오프라인';
        const mine = localCommuteLogs.find((l) => l.employeeId === user.id && l.type === 'IN');
        lastCheckInTime = mine ? formatTimeKo(mine.timestampIso) : '';
      }

      // 1-3. 팀원이 참여 중인 영상통화 방 조회
      const activeCall = rooms.find((r) => r.participants.some((p) => p.id === m.id));

      return {
        id: m.id,
        username: m.username,
        isOnline,
        status,
        lastCheckInTime,
        lastCheckOutTime,
        activeCall,
      };
    });
  };

  const membersStatus = getTeamMembersStatus();
  const filteredMembers = membersStatus.filter((m) =>
    m.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2. 대시보드용 주요 통계
  const onlineCount = membersStatus.filter((m) => m.isOnline).length;
  const workingCount = membersStatus.filter((m) => m.status === '집중 근무').length;
  const meetingCount = membersStatus.filter((m) => m.status === '회의 중').length;
  const restingCount = membersStatus.filter((m) => m.status === '자리비움').length;

  // 3. Recharts 순 인원 차트 시각화 데이터 구성
  // - 업무 시간(09:00 ~ 18:00) 내 온라인 상태인 직원의 수
  const getChartData = () => {
    // 실시간 근무 현황과 모의 일일 근무 패턴을 융합
    const basePattern = [
      { time: '09:00', 인원: Math.max(0, onlineCount - 1) },
      { time: '10:00', 인원: onlineCount },
      { time: '11:00', 인원: onlineCount },
      { time: '12:00', 인원: Math.round(onlineCount * 0.3) }, // 점심시간 인원 감소
      { time: '13:00', 인원: Math.round(onlineCount * 0.7) },
      { time: '14:00', 인원: onlineCount },
      { time: '15:00', 인원: onlineCount },
      { time: '16:00', 인원: onlineCount },
      { time: '17:00', 인원: Math.max(0, onlineCount - 1) },
      { time: '18:00', 인원: Math.round(onlineCount * 0.2) }, // 퇴근 준비
    ];
    return basePattern;
  };

  const chartData = getChartData();

  // 4. 데일리 스탠드업 필터링 리스트
  const todayStandups = standups.filter(
    (s) => s.dateStr === standupFilterDate && team.members.some((m) => m.id === s.employeeId)
  );

  const getStatusBadge = (status: UserStateType) => {
    const setting = STATUS_UI_SETTINGS[status] || STATUS_UI_SETTINGS['오프라인'];
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${setting.bgStyle} ${setting.textStyle}`}>
        {setting.icon} {setting.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-6 pb-12 px-6">
      <div className="max-w-screen-xl mx-auto">
        
        {/* 상단 액션 바 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/teams')}
              aria-label="팀 목록으로 돌아가기"
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer shadow"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white tracking-tight">{team.name} 대시보드</h1>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/15 transition cursor-pointer"
                  title="팀 코드 복사"
                >
                  <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider">{team.teamCode}</span>
                </button>
                {copied && <span className="text-[10px] text-emerald-400 font-bold animate-fade-in-up">복사됨!</span>}
              </div>
              <p className="text-xs text-slate-500 mt-1">실시간 협업 현황판과 순 근무 인원 분석 차트를 제공합니다.</p>
            </div>
          </div>
        </div>

        {/* ──── 1. 카드형 실시간 요약 현황 ──── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg">
            <p className="text-xs font-bold text-slate-500 uppercase">전체 인원</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-white">{team.members.length}</span>
              <span className="text-xs text-slate-600">명</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg">
            <p className="text-xs font-bold text-slate-500 uppercase">현재 온라인</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-emerald-400">{onlineCount}</span>
              <span className="text-xs text-slate-600">명</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg">
            <p className="text-xs font-bold text-slate-500 uppercase">집중 근무 중</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-violet-400">{workingCount}</span>
              <span className="text-xs text-slate-600">명</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg">
            <p className="text-xs font-bold text-slate-500 uppercase">회의 / 휴식</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-amber-400">{meetingCount + restingCount}</span>
              <span className="text-xs text-slate-600">명 (회의 {meetingCount} / 자리비움 {restingCount})</span>
            </div>
          </div>
        </div>

        {/* ──── 2. 순 인원 차트 시각화 및 실시간 현황판 ──── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          
          {/* 순 인원 차트 (Recharts) */}
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

          {/* ──── 3. 실시간 협업 그리드 보드 ──── */}
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" /> 실시간 협업 보드
              </h3>
              <span className="text-[10px] text-slate-500 font-mono font-bold">{onlineCount}명 근무 중</span>
            </div>

            {/* 검색 폼 */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-600 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="팀원 이름을 검색하세요"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* 팀원 상태 리스트 */}
            <div className="flex-1 overflow-y-auto max-h-[260px] space-y-2.5 pr-1">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-slate-600 text-xs">일치하는 팀원이 없습니다.</div>
              ) : (
                filteredMembers.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-850 hover:border-slate-800 transition duration-150 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 font-bold text-xs">
                          {m.username.charAt(0).toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                          m.isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{m.username}</p>
                        <p className="text-[9px] text-slate-600 font-mono mt-0.5">
                          {m.isOnline ? `출근: ${m.lastCheckInTime}` : m.lastCheckOutTime ? `퇴근: ${m.lastCheckOutTime}` : '기록 없음'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {getStatusBadge(m.status)}
                      
                      {/* 디렉토링 경보 전송 버튼 */}
                      {m.isOnline && m.id !== user?.id && (
                        <button
                          onClick={() => setPingTarget({ id: m.id, name: m.username })}
                          className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition cursor-pointer animate-pulse-subtle"
                          title="디렉토링 경보 전송"
                        >
                          ⚠️
                        </button>
                      )}

                      {/* 영상통화 핫버튼 */}
                      {m.isOnline && (
                        m.activeCall ? (
                          <button
                            onClick={() => handleJoinCall(m.activeCall!.roomId)}
                            className="p-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 transition cursor-pointer"
                            title="영상통화 참여하기"
                          >
                            <Video className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="p-1.5 rounded-lg bg-slate-800/40 text-slate-600 border border-slate-850"
                            title="영상통화 미참여 중"
                          >
                            <VideoOff className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ──── 4. 데일리 스탠드업 모아보기 피드 ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 스탠드업 피드 보드 */}
          <div className="lg:col-span-2 bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" /> 팀원 데일리 스탠드업 피드
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">매일 팀원들이 남긴 목표와 결과를 확인하고 공유하는 공간입니다.</p>
              </div>

              {/* 날짜 선택 필터 */}
              <input
                id="standup-filter-date"
                type="date"
                value={standupFilterDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStandupFilterDate(e.target.value)}
                className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-semibold focus:outline-none"
                aria-label="팀원 데일리 스탠드업 조회 날짜 선택"
              />
            </div>

            {todayStandups.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-800 rounded-xl text-center">
                <BookOpen className="w-8 h-8 text-slate-700 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-slate-600">해당 날짜에 등록된 팀원의 데일리 스탠드업 기록이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayStandups.map((s) => (
                  <div key={s.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-850 shadow-inner">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-[10px]">
                          {s.employeeName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-slate-200">{s.employeeName}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono">{s.timestampDisplay}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider block">🎯 오늘의 목표</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">{s.todayGoal}</p>
                      </div>
                      {s.todayResult && (
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">✓ 완료한 결과</span>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">{s.todayResult}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 우측 사이드 영역 */}
          <div className="flex flex-col gap-6">
            {/* ──── 실시간 상태 변경 로그 ──── */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isWsConnected ? 'bg-cyan-400' : 'bg-yellow-400'} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isWsConnected ? 'bg-cyan-500' : 'bg-yellow-500'}`}></span>
                  </span>
                  실시간 상태 변경 로그
                </h3>
                <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  수신 {alerts.length}개
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[250px] space-y-2.5 pr-1">
                {alerts.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 text-xs italic">
                    수신된 상태 변경 정보가 없습니다.
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{alert.employeeName}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{alert.eventTime}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-black text-cyan-400">
                          {alert.eventType === 'WORKING' ? '🟢 근무 중' :
                           alert.eventType === 'MEETING' ? '💬 회의 중' :
                           alert.eventType === 'AWAY' ? '🚶 자리비움' :
                           alert.eventType === 'FOCUS' ? '🎯 집중 근무' : '😴 오프라인'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ──── 5. 팀원 목록 영역 ──── */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 mb-4">
                <UserCheck className="w-4 h-4 text-cyan-400" /> 팀 구성원 목록
              </h3>
              <p className="text-xs text-slate-500 mb-6">현재 소속된 팀원의 목록입니다.</p>

              <div className="space-y-2">
                {team.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-850 group">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-xs font-semibold text-slate-300">{member.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      <MeetingRoomModalHost
        activeRoom={activeRoom}
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
      />

      {/* 디렉토링 경보 작성 모달 */}
      {pingTarget && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-red-400">⚠️</span> {pingTarget.name}님에게 디렉토링 경보 전송
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              작성한 메시지가 해당 팀원의 화면에 풀스크린 빨간색 경고 오버레이와 경보음으로 즉시 노출됩니다.
            </p>
            <textarea
              rows={3}
              value={pingMessage}
              onChange={(e) => setPingMessage(e.target.value)}
              placeholder="예: 자리를 비우신 것 같습니다. 확인 부탁드립니다."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500 transition duration-200 resize-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setPingTarget(null);
                  setPingMessage('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold cursor-pointer"
              >
                취소
              </button>
              <button
                disabled={!pingMessage.trim()}
                onClick={() => {
                  if (user) {
                    sendDirectPing(pingTarget.id, user.username, pingMessage);
                    alert(`${pingTarget.name}님에게 경보를 전송했습니다.`);
                  }
                  setPingTarget(null);
                  setPingMessage('');
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold transition cursor-pointer"
              >
                경보 발송
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
  type DashboardAlert = {
    id: string;
    employeeName: string;
    eventType: StatusType;
    eventTime: string;
    confidence: number;
    occurredAtIso: string;
  };
