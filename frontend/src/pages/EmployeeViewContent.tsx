import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../domains/auth/stores/authStore';
import CameraPanel from '../components/CameraPanel';
import { useTeamStore } from '../domains/team/stores/teamStore';
import { useCommuteStore, mapEnStatusToKoState } from '../domains/commute/stores/commuteStore';
import type { UserStateType } from '../domains/commute/stores/commuteStore';
import { useStandupStore } from '../domains/standup/stores/standupStore';
import { useVideoCallStore } from '../domains/video-call/stores/videoCallStore';
import MeetingRoomPanel from './meetingroom/MeetingRoomPanel';
import { useMonitorWS } from '../hooks/useMonitorWS';
import type { AiStatusType, NotificationResponse } from '../lib/types';
import { Navigate } from 'react-router-dom';
import EmployeeSidebar from '../domains/commute/components/EmployeeSidebar';
import EmployeeHeader from './employee-dashboard/components/EmployeeHeader';
import EmployeeCommutePanel from './employee-dashboard/components/EmployeeCommutePanel';
import EmployeeStatusControl from './employee-dashboard/components/EmployeeStatusControl';
import EmployeeStandupForm from './employee-dashboard/components/EmployeeStandupForm';
import EmployeeDirectPingModal from './employee-dashboard/components/EmployeeDirectPingModal';
import { webSocketService } from '../lib/websocket';
import { WEBSOCKET_TOPICS } from '../lib/constants';
import { parseWsEnvelope } from '../lib/wsEvent';

export default function EmployeeView() {
  const getErrorMessage = (err: unknown, fallback: string): string =>
    err instanceof Error && err.message ? err.message : fallback;

  const isNotificationResponse = (value: unknown): value is NotificationResponse => {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return typeof v.notificationId === 'number'
      && typeof v.receiverId === 'number'
      && typeof v.senderUsername === 'string'
      && typeof v.message === 'string'
      && typeof v.notificationType === 'string';
  };
  const { user, token, isAuthenticated } = useAuthStore();
  const fetchMyTeam = useTeamStore((s) => s.fetchMyTeam);
  const teams = useTeamStore((s) => s.teams);
  const memberTeamMap = useTeamStore((s) => s.memberTeamMap);
  const syncTeamContext = useTeamStore((s) => s.syncMemberContext);
  
  // Zustand 스토어들 연동
  const { 
    commuteStatus, 
    userState, 
    checkInTime, 
    checkOutTime, 
    checkIn, 
    checkOut, 
    setUserState, 
    logs, 
    isCameraActive, 
    cameraStream,
    startCamera, 
    stopCamera,
    directPings,
    dismissDirectPing,
    loadDirectPings,
    addDirectPingFromNotification,
    syncEmployeeContext
  } = useCommuteStore();
  const standups = useStandupStore((s) => s.standups);
  const addStandup = useStandupStore((s) => s.addStandup);
  const loadMyTodayStandup = useStandupStore((s) => s.loadMyTodayStandup);
  const syncStandupContext = useStandupStore((s) => s.syncMemberContext);
  const { handleWebsocketEvent: handleVideoCallWS } = useVideoCallStore();

  // 입력용 로컬 상태
  const [todayGoal, setTodayGoal] = useState('');
  const [todayResult, setTodayResult] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // AI 모니터링 관련 상태
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<AiStatusType>('WORKING');
  const [confidence, setConfidence] = useState(100);

  // 키보드/마우스 입력 무감지 상태
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;
    
    const resetIdle = () => {
      setIsIdle(false);
      clearTimeout(idleTimer);
      // 5분(300,000ms) 동안 이벤트가 없으면 idle 상태로 전환 (AI가 인식하지 못하는 경우의 백업)
      idleTimer = setTimeout(() => setIsIdle(true), 300000); 
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('scroll', resetIdle);
    window.addEventListener('click', resetIdle);

    resetIdle();

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('scroll', resetIdle);
      window.removeEventListener('click', resetIdle);
      clearTimeout(idleTimer);
    };
  }, []);

  // 팀 정보 조회
  useEffect(() => {
    if (user && user.id) {
      syncTeamContext(user.id);
      syncStandupContext(user.id);
      void fetchMyTeam();
    }
  }, [fetchMyTeam, user, syncTeamContext, syncStandupContext]);

  // 마운트 시 데이터 로드
  useEffect(() => {
    if (user && user.id) {
      syncEmployeeContext(user.id);
    }
  }, [user, syncEmployeeContext]);

  useEffect(() => {
    if (user) {
      loadMyTodayStandup();
      loadDirectPings();
    }
  }, [user, loadMyTodayStandup, loadDirectPings]);

  // 실시간 시계 작동
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const team = (() => {
    if (!user?.id) return undefined;
    const teamId = memberTeamMap[user.id];
    if (!teamId) return undefined;
    return teams.find((t) => t.id === teamId);
  })();

  // 실시간 웹소켓 구독 (팀 토픽 및 개인 알림)
  useEffect(() => {
    if (!user || commuteStatus !== 'WORK' || !team?.id) return;

    webSocketService.connect((connected) => {
      if (connected) {
        // 1. 팀 토픽 구독 (team.id 사용)
        const teamTopic = WEBSOCKET_TOPICS.TEAM(team.id);
        webSocketService.subscribe(teamTopic, (msg) => {
          const envelope = parseWsEnvelope(msg);
          if (!envelope) return;
          handleVideoCallWS(envelope);
          useStandupStore.getState().handleWebsocketEvent(envelope);
        });

        // 2. 개인 토픽 구독
        const memberTopic = WEBSOCKET_TOPICS.MEMBER(user.id);
        webSocketService.subscribe(memberTopic, (msg) => {
          const envelope = parseWsEnvelope(msg);
          if (!envelope) return;
          if (envelope.event === 'INVITED' || envelope.event === 'JOIN_REQUESTED' || envelope.event === 'REQUEST_ACCEPTED' || envelope.event === 'REQUEST_REJECTED') {
            handleVideoCallWS(envelope);
          }
          if (isNotificationResponse(envelope.data)) {
            addDirectPingFromNotification(envelope.data);
          }
        });
      }
    });

    return () => {
      if (team?.id) {
        webSocketService.unsubscribe(WEBSOCKET_TOPICS.TEAM(team.id));
      }
      webSocketService.unsubscribe(WEBSOCKET_TOPICS.MEMBER(user.id));
      webSocketService.disconnect();
    };
  }, [user, commuteStatus, team?.id, handleVideoCallWS, addDirectPingFromNotification]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playedPingsRef = useRef<Set<string>>(new Set());
  const alarmAudioContextRef = useRef<AudioContext | null>(null);

  // 카메라 비디오 엘리먼트 소스 연결
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // AI 모니터링 웹소켓 훅 연동
  const { sendFrame, wsReady, error: wsError, lastResult } = useMonitorWS(
    isMonitoring && !!user,
    user?.id || 0,
    token
  );

  // AI 모니터링 연동 및 상태 자동 갱신
  useEffect(() => {
    if (lastResult && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentStatus(lastResult.state);
      setConfidence(Math.round(lastResult.confidence * 100));

      // AI 결과값을 한글 상태로 매핑
      const mappedAiState = mapEnStatusToKoState(lastResult.state);
      
      // AI가 자리비움으로 판단했거나, 키보드/마우스 입력이 5분간 없었던 경우
      const effectiveState = isIdle ? '자리비움' : mappedAiState;
      
      // 수동으로 설정한 '회의 중', '집중 근무' 상태를 덮어쓰지 않도록 '근무 중'과 '자리비움' 사이에서만 자동 전환
      if (effectiveState === '자리비움' && userState === '근무 중') {
        setUserState(user.id, user.username, '자리비움').catch(err => {
          console.error('AI 상태 업데이트 자동 트리거 실패:', err);
        });
      } else if (effectiveState === '근무 중' && userState === '자리비움') {
        setUserState(user.id, user.username, '근무 중').catch(err => {
          console.error('AI 상태 업데이트 자동 트리거 실패:', err);
        });
      }
    }
  }, [lastResult, isIdle, user, userState, setUserState]);

  // 250ms 간격 프레임 전송 루프
  useEffect(() => {
    if (!wsReady || !isCameraActive || !videoRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const intervalId = setInterval(() => {
      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = 320;
        canvas.height = 240;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const base64DataUrl = canvas.toDataURL('image/jpeg', 0.6);
          const pureBase64 = base64DataUrl.split(',')[1] || base64DataUrl;
          sendFrame(pureBase64);
        } catch (e) {
          console.error('Frame capturing failed:', e);
        }
      }
    }, 250);

    return () => clearInterval(intervalId);
  }, [wsReady, isCameraActive, sendFrame]);

  // 경보음 합성 재생 함수
  const playAlarm = () => {
    try {
      const WebAudioContext =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!WebAudioContext) return;

      if (!alarmAudioContextRef.current || alarmAudioContextRef.current.state === 'closed') {
        alarmAudioContextRef.current = new WebAudioContext();
      }
      const ctx = alarmAudioContextRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const now = ctx.currentTime;
      
      const playBeep = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration - 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
      };

      playBeep(now, 880, 0.25);
      playBeep(now + 0.3, 880, 0.25);
      playBeep(now + 0.6, 1200, 0.4);
    } catch (e) {
      console.error('알람 소리 재생 실패:', e);
    }
  };

  // 상사 경보(DirectPing) 수신 시 알람음 재생
  useEffect(() => {
    if (user) {
      const pendingPings = directPings.filter(
        (p) => p.employeeId === user.id && p.status === 'pending'
      );
      
      let shouldPlay = false;
      pendingPings.forEach((p) => {
        if (!playedPingsRef.current.has(p.id)) {
          playedPingsRef.current.add(p.id);
          shouldPlay = true;
        }
      });

      if (shouldPlay) {
        playAlarm();
      }
    }
  }, [directPings, user]);

  useEffect(() => {
    if (!user) return;
    const activePingIds = new Set(
      directPings.filter((p) => p.employeeId === user.id).map((p) => p.id)
    );
    playedPingsRef.current.forEach((id) => {
      if (!activePingIds.has(id)) {
        playedPingsRef.current.delete(id);
      }
    });
  }, [directPings, user]);

  useEffect(() => {
    return () => {
      if (alarmAudioContextRef.current && alarmAudioContextRef.current.state !== 'closed') {
        void alarmAudioContextRef.current.close();
      }
      alarmAudioContextRef.current = null;
    };
  }, []);

  // 오늘 날짜 문자열
  const todayStr = new Date().toISOString().split('T')[0];
  const myTodayStandup = standups.find(
    (s) => s.employeeId === user?.id && s.dateStr === todayStr
  );

  // 이미 오늘 작성한 스탠드업이 있을 경우 폼 초기화 채우기
  useEffect(() => {
    if (myTodayStandup) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTodayGoal(myTodayStandup.todayGoal);
      setTodayResult(myTodayStandup.todayResult);
    }
  }, [myTodayStandup]);

  // 출근 처리
  const handleCheckIn = async () => {
    if (user) {
      try {
        await checkIn(user.id, user.username);
        await startCamera();
      } catch (err: unknown) {
        alert(getErrorMessage(err, '출근 처리에 실패했습니다.'));
      }
    }
  };

  // 퇴근 처리
  const handleCheckOut = async () => {
    if (user && confirm('정말 퇴근하시겠습니까? 오늘 근무가 종료되며 상태가 오프라인으로 변경됩니다.')) {
      try {
        await checkOut(user.id, user.username);
        stopCamera();
        setIsMonitoring(false);
      } catch (err: unknown) {
        alert(getErrorMessage(err, '퇴근 처리에 실패했습니다.'));
      }
    }
  };

  // 수동 상태 설정 처리
  const handleStateChange = async (status: UserStateType) => {
    if (commuteStatus !== 'WORK') {
      alert('업무 시작(출근)을 먼저 눌러주세요.');
      return;
    }
    if (user) {
      try {
        await setUserState(user.id, user.username, status);
      } catch (err: unknown) {
        alert(getErrorMessage(err, '상태 설정에 실패했습니다.'));
      }
    }
  };

  // 데일리 스탠드업 제출 처리
  const handleStandupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (commuteStatus !== 'WORK') {
      alert('업무 시작(출근) 상태에서만 스탠드업을 등록할 수 있습니다.');
      return;
    }
    if (!todayGoal.trim()) {
      alert('오늘의 목표를 입력해 주세요.');
      return;
    }
    if (user) {
      try {
        await addStandup(user.id, user.username, todayGoal, todayResult);
        alert('데일리 스탠드업이 등록/수정되었습니다.');
      } catch (err: unknown) {
        alert(getErrorMessage(err, '데일리 스탠드업 등록에 실패했습니다.'));
      }
    }
  };

  // AI 모니터링 시작 토글
  const handleToggleMonitoring = () => {
    if (commuteStatus !== 'WORK') {
      alert('업무 시작(출근)을 먼저 완료한 후 모니터링을 시작해 주세요.');
      return;
    }
    setIsMonitoring(!isMonitoring);
  };

  if (!isAuthenticated || user?.role !== 'EMPLOYEE') {
    return <Navigate to="/login" replace />;
  }

  if (!team) {
    return <Navigate to="/join-team" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-6 pb-12 px-6">
      <div className="max-w-screen-xl mx-auto">
        <EmployeeHeader 
          isCameraActive={isCameraActive} 
          currentTime={currentTime} 
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <EmployeeCommutePanel 
            commuteStatus={commuteStatus}
            checkInTime={checkInTime}
            checkOutTime={checkOutTime}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
          />
          <EmployeeStatusControl 
            userState={userState}
            commuteStatus={commuteStatus}
            onStateChange={handleStateChange}
          />
        </div>

        {/* 메인 레이아웃 분기 */}
        {commuteStatus === 'LEAVE' ? (
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center text-emerald-400 text-2xl font-bold">✓</div>
            <h2 className="text-xl font-bold text-white tracking-tight">오늘 근무가 모두 완료되었습니다.</h2>
            <p className="text-slate-500 text-sm max-w-md leading-relaxed">오늘 하루 수고 많으셨습니다! 퇴근 로그가 안전하게 기록되었으며 다음 출근 시 패널이 재활성화됩니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              {commuteStatus === 'WORK' && (
                <div className="flex flex-col gap-3">
                  <CameraPanel
                    isMonitoring={isMonitoring}
                    isConnected={wsReady}
                    videoRef={videoRef}
                    currentStatus={currentStatus}
                    confidence={confidence}
                    onToggleMonitoring={handleToggleMonitoring}
                  />
                  {wsError && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
                      <span>⚠️ {wsError}</span>
                    </div>
                  )}
                </div>
              )}
              
              <EmployeeStandupForm 
                todayGoal={todayGoal}
                setTodayGoal={setTodayGoal}
                todayResult={todayResult}
                setTodayResult={setTodayResult}
                onSubmit={handleStandupSubmit}
                commuteStatus={commuteStatus}
                hasTodayStandup={!!myTodayStandup}
              />

              <MeetingRoomPanel user={user} commuteStatus={commuteStatus} requireWorkStatus />
            </div>

            <EmployeeSidebar
              username={user.username}
              userState={userState}
              commuteStatus={commuteStatus}
              logs={logs}
              todayStandup={myTodayStandup}
              teamName={team.name}
              teamCode={team.teamCode}
            />
          </div>
        )}
      </div>

      {(() => {
        const pendingPings = directPings.filter(
          (p) => p.employeeId === user?.id && p.status === 'pending'
        );
        return (
          <EmployeeDirectPingModal 
            ping={pendingPings[0]}
            totalPendingCount={pendingPings.length}
            onDismiss={dismissDirectPing}
          />
        );
      })()}
    </div>
  );
}
