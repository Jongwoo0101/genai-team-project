import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../domains/auth/stores/authStore';
import CameraBadge from '../components/CameraBadge';
import CameraPanel from '../components/CameraPanel';
import { useTeamStore } from '../domains/team/stores/teamStore';
import { useCommuteStore } from '../domains/commute/stores/commuteStore';
import type { UserStateType } from '../domains/commute/stores/commuteStore';
import { useStandupStore } from '../domains/standup/stores/standupStore';
import { useVideoCallStore } from '../domains/video-call/stores/videoCallStore';
import MeetingRoomPanel from './meetingroom/MeetingRoomPanel';
import { useMonitorWS } from '../hooks/useMonitorWS';
import type { AiStatusType, NotificationResponse } from '../lib/types';
import { Navigate } from 'react-router-dom';
import EmployeeSidebar from '../domains/commute/components/EmployeeSidebar';
import { Clock, LogIn, LogOut, Play, BookOpen, Send } from 'lucide-react';
import { webSocketService } from '../lib/websocket';
import { WEBSOCKET_TOPICS } from '../lib/constants';
import { formatDateTimeKo } from '../lib/datetime';
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
  const { handleWebsocketEvent: handleVideoCallWS } = useVideoCallStore();

  // 입력용 로컬 상태
  const [todayGoal, setTodayGoal] = useState('');
  const [todayResult, setTodayResult] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // AI 모니터링 관련 상태
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<AiStatusType>('WORKING');
  const [confidence, setConfidence] = useState(100);

  // 팀 정보 조회
  useEffect(() => {
    if (user && user.id) {
      useTeamStore.getState().syncMemberContext(user.id);
      useStandupStore.getState().syncMemberContext(user.id);
      void fetchMyTeam();
    }
  }, [fetchMyTeam, user]);

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

  // 실시간 웹소켓 구독 (매니저 토픽 및 개인 알림)
  useEffect(() => {
    if (!user || commuteStatus !== 'WORK' || !team?.managerId) return;

    webSocketService.connect((connected) => {
      if (connected) {
        // 1. 팀 토픽 구독
        const teamTopic = WEBSOCKET_TOPICS.TEAM(team.managerId);
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
          if (envelope.event === 'INVITED' || envelope.event === 'REQUEST_ACCEPTED' || envelope.event === 'REQUEST_REJECTED') {
            handleVideoCallWS(envelope);
          }
          if (isNotificationResponse(envelope.data)) {
            addDirectPingFromNotification(envelope.data);
          }
        });
      }
    });

    return () => {
      if (team?.managerId) {
        webSocketService.unsubscribe(WEBSOCKET_TOPICS.TEAM(team.managerId));
      }
      webSocketService.unsubscribe(WEBSOCKET_TOPICS.MEMBER(user.id));
      webSocketService.disconnect();
    };
  }, [user, commuteStatus, team?.managerId, handleVideoCallWS, addDirectPingFromNotification]);

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
    if (lastResult) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentStatus(lastResult.state);
      setConfidence(Math.round(lastResult.confidence * 100));

      if (user) {
        const isAway = lastResult.state === 'AWAY';
        const isWorking = lastResult.state === 'WORKING';

        if (isAway && userState === '근무 중') {
          setUserState(user.id, user.username, '자리비움').catch(err => {
            console.error('AI 상태 업데이트 자동 트리거 실패:', err);
          });
        } else if (isWorking && userState === '자리비움') {
          setUserState(user.id, user.username, '근무 중').catch(err => {
            console.error('AI 상태 업데이트 자동 트리거 실패:', err);
          });
        }
      }
    }
  }, [lastResult, user, userState, setUserState]);

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
          const base64 = canvas.toDataURL('image/jpeg', 0.6);
          sendFrame(base64);
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
        {/* 상단 타이틀 바 */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">나의 워크스페이스</h1>
            <p className="text-slate-500 text-sm mt-1">비대면 근무 상황을 실시간으로 팀원들과 공유하고 온라인으로 협업하세요.</p>
            {isCameraActive && <CameraBadge />}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2 text-slate-300 text-sm self-start md:self-auto shadow-md">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold">현재 시각: {currentTime.toLocaleTimeString('ko-KR')}</span>
          </div>
        </div>

        {/* ──── 출퇴근 컨트롤 패널 ──── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/20 border border-indigo-500/10 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-slate-400 font-semibold flex items-center gap-2 text-sm">
                  <LogIn className="w-4 h-4 text-emerald-400" /> 출퇴근 제어 패널
                </span>
                <p className="text-xs text-slate-500 mt-1">업무 시작을 클릭하면 팀원들에게 온라인으로 표시됩니다.</p>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold self-start sm:self-auto border ${
                commuteStatus === 'WORK' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                commuteStatus === 'LEAVE' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {commuteStatus === 'WORK' ? '근무 중' : commuteStatus === 'LEAVE' ? '퇴근 완료' : '출근 전'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">출근 시각 기록</span>
                <span className="text-sm text-slate-200 font-mono mt-1 font-bold">{checkInTime ? formatDateTimeKo(checkInTime) : '기록 없음'}</span>
              </div>
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">퇴근 시각 기록</span>
                <span className="text-sm text-slate-200 font-mono mt-1 font-bold">{checkOutTime ? formatDateTimeKo(checkOutTime) : '기록 없음'}</span>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleCheckIn}
                disabled={commuteStatus === 'WORK'}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 disabled:shadow-none cursor-pointer"
              >
                <LogIn className="w-4 h-4" /> 업무 시작 (출근)
              </button>
              <button
                onClick={handleCheckOut}
                disabled={commuteStatus !== 'WORK'}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-red-600/10 disabled:shadow-none cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> 업무 종료 (퇴근)
              </button>
            </div>
          </div>

          {/* ──── 수동 상태(State) 설정 패널 ──── */}
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <span className="text-slate-400 font-semibold flex items-center gap-2 text-sm">
                <Play className="w-4 h-4 text-violet-400" /> 현재 나의 상태 설정
              </span>
              <p className="text-xs text-slate-500 mt-1 mb-6">스스로 상태를 선택하여 팀원들에게 내 상황을 공유하세요.</p>
            </div>

            <div className="space-y-3">
              {(['집중 근무', '회의 중', '자리비움'] as const).map((status) => {
                const isSelected = userState === status;
                const getBtnStyles = () => {
                  if (!isSelected) return 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800';
                  if (status === '집중 근무') return 'bg-violet-600/10 border-violet-500 text-violet-400 font-bold';
                  if (status === '회의 중') return 'bg-amber-600/10 border-amber-500 text-amber-400 font-bold';
                  return 'bg-sky-600/10 border-sky-500 text-sky-400 font-bold';
                };

                const getIcon = () => {
                  if (status === '집중 근무') return '🎯';
                  if (status === '회의 중') return '💬';
                  return '🚶';
                };

                return (
                  <button
                    key={status}
                    onClick={() => handleStateChange(status)}
                    disabled={commuteStatus !== 'WORK'}
                    className={`w-full py-3.5 px-4 rounded-xl border text-sm transition duration-200 flex items-center gap-3 cursor-pointer ${getBtnStyles()} disabled:opacity-40 disabled:hover:bg-transparent`}
                  >
                    <span className="text-lg">{getIcon()}</span>
                    <span>{status}</span>
                    {isSelected && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-current animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
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
            {/* 좌측 콘텐츠 영역 */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* AI 모니터링 카메라 패널 */}
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
              
              {/* ──── 데일리 스탠드업 폼 ──── */}
              <div className="rounded-2xl bg-slate-900 border border-white/5 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-300 font-semibold flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4 text-cyan-400" /> 데일리 스탠드업 (오늘의 업무 계획/결과)
                  </span>
                  {myTodayStandup && (
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                      오늘 등록 완료
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-6">매일 하루의 목표와 완료된 결과를 입력해 팀원들과 협업 대시보드에 공유하세요.</p>

                <form onSubmit={handleStandupSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="goal" className="block text-xs font-semibold text-slate-400 mb-1.5">오늘의 목표 (출근 시 필수)</label>
                    <textarea
                      id="goal"
                      rows={2}
                      value={todayGoal}
                      onChange={(e) => setTodayGoal(e.target.value)}
                      disabled={commuteStatus !== 'WORK'}
                      placeholder="예: 오늘 신규 대시보드 UI 연동 완료 및 Recharts 차트 검증 진행"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition duration-200 resize-none disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label htmlFor="result" className="block text-xs font-semibold text-slate-400 mb-1.5">오늘 완료한 결과 / 진행 현황 (퇴근 전 권장)</label>
                    <textarea
                      id="result"
                      rows={2}
                      value={todayResult}
                      onChange={(e) => setTodayResult(e.target.value)}
                      disabled={commuteStatus !== 'WORK'}
                      placeholder="예: 1. Recharts를 이용한 순 인원 차트 렌더링 완료  2. WebRTC 비디오 스트림 가상 연결 테스트 성공"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition duration-200 resize-none disabled:opacity-40"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={commuteStatus !== 'WORK' || !todayGoal.trim()}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    <span>스탠드업 {myTodayStandup ? '수정/갱신하기' : '공유하기'}</span>
                  </button>
                </form>
              </div>

              <MeetingRoomPanel user={user} commuteStatus={commuteStatus} requireWorkStatus />
            </div>

            {/* 우측 사이드바 영역 */}
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

      {/* 상사 직접 경보(DirectPing) 모달 */}
      {(() => {
        const pendingPings = directPings.filter(
          (p) => p.employeeId === user?.id && p.status === 'pending'
        );
        const ping = pendingPings[0];
        if (!ping) return null;
        return (
          <div className="fixed inset-0 z-[110] bg-red-950/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-slate-900 border-2 border-red-500 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 text-3xl font-extrabold mb-4 animate-ping">
                ⚠️
              </div>
              <h3 className="text-xl font-black text-red-400 tracking-tight mb-2">상사 긴급 경고</h3>
              <p className="text-sm text-slate-400 mb-2">
                <strong>{ping.fromName}</strong> 상사로부터 메시지가 전달되었습니다.
              </p>
              <p className="text-xs text-slate-500 mb-6">
                {pendingPings.length > 1 ? `${pendingPings.length}건 중 1건 표시` : '1건 표시'}
              </p>
              <div className="w-full bg-slate-950/80 border border-red-500/20 rounded-2xl p-5 mb-8 text-left text-sm text-slate-100 font-medium leading-relaxed shadow-inner">
                {ping.message}
              </div>
              <button
                onClick={() => dismissDirectPing(ping.id)}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-red-600/20 transition-all duration-300 cursor-pointer"
              >
                확인했습니다
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
