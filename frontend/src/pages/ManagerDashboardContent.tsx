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
import { Video } from 'lucide-react';
import ManagerHeader from './manager-dashboard/components/ManagerHeader';
import ManagerStatCards from './manager-dashboard/components/ManagerStatCards';
import ManagerPresenceChart from './manager-dashboard/components/ManagerPresenceChart';
import ManagerTeamGrid from './manager-dashboard/components/ManagerTeamGrid';
import ManagerStandupFeed from './manager-dashboard/components/ManagerStandupFeed';
import ManagerAlertLog from './manager-dashboard/components/ManagerAlertLog';
import ManagerTeamList from './manager-dashboard/components/ManagerTeamList';
import ManagerPingModal from './manager-dashboard/components/ManagerPingModal';
import type { DashboardAlert } from './manager-dashboard/components/ManagerAlertLog';

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
    invitations,
    handleAcceptInvitation,
    declineInvitation,
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
    if (user?.id && teamId) {
      syncTeamContext(user.id);
      syncStandupContext(user.id);
      void fetchTeamMembers(Number(teamId));
      void loadTeamStandups(standupFilterDate);
    }
  }, [fetchTeamMembers, user?.id, teamId, loadTeamStandups, standupFilterDate, syncTeamContext, syncStandupContext]);

  // 실시간 상태 데이터 조회 및 실시간 웹소켓 구독
  useEffect(() => {
    if (!user || !teamId) return;

    // 1. 초기 실시간 상태 데이터 로드
    api.getTeamMemberStatuses(Number(teamId))
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

    // 3. 토픽 구독 (/topic/team/{teamId})
    const topic = WEBSOCKET_TOPICS.TEAM(teamId);
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
  }, [user, teamId, handleVideoCallWS]);

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
        
        <ManagerHeader team={team} />
        
        <ManagerStatCards 
          team={team} 
          onlineCount={onlineCount} 
          workingCount={workingCount} 
          meetingCount={meetingCount} 
          restingCount={restingCount} 
        />
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <ManagerPresenceChart onlineCount={onlineCount} />
          <ManagerTeamGrid 
            user={user}
            membersStatus={membersStatus}
            onlineCount={onlineCount}
            onJoinCall={handleJoinCall}
            onDirectPing={(id, name) => setPingTarget({ id, name })}
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ManagerStandupFeed 
            todayStandups={todayStandups}
            standupFilterDate={standupFilterDate}
            onFilterDateChange={setStandupFilterDate}
          />
          <div className="flex flex-col gap-6">
            <ManagerAlertLog 
              alerts={alerts}
              onClearAlerts={() => setAlerts([])}
              isWsConnected={isWsConnected}
            />
            <ManagerTeamList team={team} />
          </div>
        </div>
      </div>

      <MeetingRoomModalHost
        activeRoom={activeRoom}
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
      />

      <ManagerPingModal 
        pingTarget={pingTarget}
        onClose={() => setPingTarget(null)}
        onSendPing={(id, msg) => {
          if (user) {
            sendDirectPing(id, user.username, msg);
          }
        }}
      />

      {invitations
        .filter((i) => i.inviteeId === user?.id && i.status === 'pending')
        .map((inv) => (
          <div
            key={inv.inviteId}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl w-80 backdrop-blur-md animate-bounce"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Video className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">회의 초대 도착</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  <strong>{inv.hostName}</strong>님이 <strong>{inv.roomTitle}</strong> 회의에 초대하셨습니다.
                </p>
                <div className="flex gap-2 mt-4 justify-end">
                  <button
                    onClick={() => declineInvitation(inv.roomId, inv.inviteId)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition duration-200 cursor-pointer"
                  >
                    거절
                  </button>
                  <button
                    onClick={() => handleAcceptInvitation(inv.roomId, inv.inviteId)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition duration-200 cursor-pointer"
                  >
                    수락 및 입장
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
