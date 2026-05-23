import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../domains/auth/stores/authStore';
import CameraBadge from '../components/CameraBadge';
import CameraPanel from '../components/CameraPanel';
import { useTeamStore } from '../domains/team/stores/teamStore';
import { useCommuteStore } from '../domains/commute/stores/commuteStore';
import type { UserStateType } from '../domains/commute/stores/commuteStore';
import { useStandupStore } from '../domains/standup/stores/standupStore';
import { useVideoCallStore } from '../domains/video-call/stores/videoCallStore';
import { useMonitorWS } from '../hooks/useMonitorWS';
import type { AiStatusType, NotificationResponse } from '../lib/types';
import { Navigate } from 'react-router-dom';
import EmployeeSidebar from '../domains/commute/components/EmployeeSidebar';
import VideoCallModal from '../domains/video-call/components/VideoCallModal';
import { Clock, LogIn, LogOut, Video, Play, Plus, BookOpen, Send } from 'lucide-react';
import { webSocketService } from '../lib/websocket';
import { WEBSOCKET_TOPICS } from '../lib/constants';
import { formatDateTimeKo } from '../lib/datetime';
import { parseWsEnvelope } from '../lib/wsEvent';
import * as api from '../lib/api';

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
  const { getEmployeeTeam, fetchMyTeam } = useTeamStore();
  
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
  const { standups, addStandup, loadMyTodayStandup } = useStandupStore();
  const { 
    rooms, 
    activeRoom, 
    createRoom, 
    joinRoom, 
    invitations, 
    acceptInvitation, 
    declineInvitation, 
    joinRequests, 
    requestJoinRoom,
    loadRooms,
    handleWebsocketEvent: handleVideoCallWS
  } = useVideoCallStore();

  // 입력용 로컬 상태
  const [todayGoal, setTodayGoal] = useState('');
  const [todayResult, setTodayResult] = useState('');
  const [roomTitle, setRoomTitle] = useState('');
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // AI 모니터링 관련 상태
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<AiStatusType>('WORKING');
  const [confidence, setConfidence] = useState(100);

  // 팀 정보 조회
  useEffect(() => {
    fetchMyTeam();
  }, [fetchMyTeam]);

  // 마운트 시 데이터 로드
  useEffect(() => {
    if (user?.id) {
      syncEmployeeContext(user.id);
    }
  }, [user?.id, syncEmployeeContext]);

  useEffect(() => {
    if (user) {
      loadMyTodayStandup();
      loadRooms();
      loadDirectPings();
    }
  }, [user, loadMyTodayStandup, loadRooms, loadDirectPings]);

  // 실시간 시계 작동
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const team = user?.id ? getEmployeeTeam(user.id) : undefined;

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
  const processedRequestsRef = useRef<Set<number>>(new Set());

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
      const WebAudioContext = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!WebAudioContext) return;
      const ctx = new WebAudioContext();
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

  // 내가 보낸 참가 요청이 승인되면 자동으로 회의실 입장
  useEffect(() => {
    if (user && !activeRoom) {
      const approvedRequest = joinRequests.find(
        (r) => r.userId === user.id && r.status === 'approved' && !processedRequestsRef.current.has(r.requestId)
      );
      if (approvedRequest) {
        processedRequestsRef.current.add(approvedRequest.requestId);
        joinRoom(approvedRequest.roomId);
        setIsVideoModalOpen(true);
      }
    }
  }, [joinRequests, activeRoom, user, joinRoom]);

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

  // 가상 영상통화 방 만들기
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (commuteStatus !== 'WORK') {
      alert('업무 시작(출근)을 먼저 완료한 후 영상통화를 개설할 수 있습니다.');
      return;
    }
    if (!roomTitle.trim()) {
      alert('방 제목을 입력해 주세요.');
      return;
    }
    if (user) {
      try {
        await createRoom(roomTitle);
        setRoomTitle('');
        setIsCreateRoomOpen(false);
        setIsVideoModalOpen(true);
      } catch (err: unknown) {
        alert(getErrorMessage(err, '회의실 개설에 실패했습니다.'));
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

  // 영상통화 참가하기
// EmployeeView.tsx — handleJoinRoom 함수만 아래 내용으로 교체하세요

  const handleJoinRoom = async (roomId: number) => {
    if (commuteStatus !== 'WORK') {
      alert('업무 시작(출근)을 먼저 완료해야 영상통화에 참가할 수 있습니다.');
      return;
    }
    if (!user) return;

    const targetRoom = rooms.find((r) => r.roomId === roomId);
    if (!targetRoom) return;

    const isHost = targetRoom.hostId === user.id;

    if (isHost) {
      // ✅ 수정: 호스트는 바로 상세 조회 후 입장
      // (rooms의 participants는 항상 빈 배열이므로 isAlreadyParticipant 체크 제거)
      await joinRoom(roomId);
      setIsVideoModalOpen(true);
      return;
    }

    // ✅ 수정: 호스트가 아닌 경우 — 상세 조회로 ACCEPTED 여부 확인
    try {
      const detail = await api.getMeetingDetail(roomId);
      const isAccepted = detail.participants.some(
        (p) => p.memberId === user.id && p.requestStatus === 'ACCEPTED'
      );

      if (isAccepted) {
        // 이미 수락된 참가자면 바로 입장
        await joinRoom(roomId);
        setIsVideoModalOpen(true);
        return;
      }
    } catch {
      // 상세 조회 실패 시 참가 요청으로 폴백
    }

    // 이미 대기 중인 요청이 있는지 확인
    const hasPendingRequest = joinRequests.some(
      (r) => r.roomId === roomId && r.userId === user.id && r.status === 'pending'
    );
    if (hasPendingRequest) {
      alert('이미 참가 대기 요청을 보냈습니다. 호스트의 승인을 기다려 주세요.');
      return;
    }

    // 참가 요청 전송
    try {
      await requestJoinRoom(roomId);
      alert('참가 대기 요청을 보냈습니다. 호스트가 승인하면 입장됩니다.');
    } catch (err: unknown) {
      alert(getErrorMessage(err, '참가 대기 요청에 실패했습니다.'));
    }
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

              {/* ──── 온라인 영상통화 회의실 ──── */}
              <div className="rounded-2xl bg-slate-900 border border-white/5 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-300 font-semibold flex items-center gap-2 text-sm">
                    <Video className="w-4 h-4 text-cyan-400" /> 실시간 가상 영상통화 회의실
                  </span>
                  <button
                    onClick={() => {
                      if (commuteStatus !== 'WORK') {
                        alert('업무 시작(출근)을 완료해 주세요.');
                        return;
                      }
                      setIsCreateRoomOpen(!isCreateRoomOpen);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> 방 개설하기
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-6">팀원들과 실시간 화상 대화가 필요할 때 방을 만들거나 다른 팀원의 회의에 참여하세요.</p>

                {isCreateRoomOpen && (
                  <form onSubmit={handleCreateRoom} className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="개설할 회의실 제목을 입력해 주세요"
                      value={roomTitle}
                      onChange={(e) => setRoomTitle(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreateRoomOpen(false)}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs cursor-pointer"
                      >
                        개설 완료
                      </button>
                    </div>
                  </form>
                )}

                {rooms.length === 0 ? (
                  <div className="py-12 border border-dashed border-slate-800 rounded-xl text-center">
                    <Video className="w-8 h-8 text-slate-700 mx-auto mb-2.5 opacity-50" />
                    <p className="text-xs text-slate-600">현재 개설된 영상통화 회의실이 없습니다.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {rooms.map((room) => (
                      <div
                        key={room.roomId}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex flex-col justify-between gap-4 group hover:border-cyan-500/30 transition-all duration-300"
                      >
                        <div>
                          <h4 className="text-sm font-bold text-white truncate">{room.title}</h4>
                          <span className="text-[10px] text-slate-500 mt-0.5 block">개설자: {room.hostName}</span>
                          <span className="inline-flex items-center gap-1 mt-2 text-[10px] text-cyan-400 font-semibold bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">
                            참여자 {room.participants.length}명
                          </span>
                        </div>
                        <button
                          onClick={() => handleJoinRoom(room.roomId)}
                          className="w-full py-2 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 font-semibold text-xs transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>회의 입장하기</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

      {/* 가상 영상통화 룸 오버레이 모달 */}
      {isVideoModalOpen && activeRoom && (
        <VideoCallModal onClose={() => setIsVideoModalOpen(false)} />
      )}

      {/* 회의 초대 알림 */}
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
                    onClick={async () => {
                      await acceptInvitation(inv.roomId, inv.inviteId);
                      setIsVideoModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition duration-200 cursor-pointer"
                  >
                    수락 및 입장
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

      {/* 상사 직접 경보(DirectPing) 모달 */}
      {directPings
        .filter((p) => p.employeeId === user?.id && p.status === 'pending')
        .map((ping) => (
          <div key={ping.id} className="fixed inset-0 z-[110] bg-red-950/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-slate-900 border-2 border-red-500 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 text-3xl font-extrabold mb-4 animate-ping">
                ⚠️
              </div>
              <h3 className="text-xl font-black text-red-400 tracking-tight mb-2">상사 긴급 경고</h3>
              <p className="text-sm text-slate-400 mb-6">
                <strong>{ping.fromName}</strong> 상사로부터 메시지가 전달되었습니다.
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
        ))}
    </div>
  );
}
