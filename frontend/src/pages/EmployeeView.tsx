import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTeamStore } from '../store/teamStore';
import { useCommuteStore } from '../store/commuteStore';
import { useAwayStore } from '../store/awayStore';
import type { AwayReason } from '../store/awayStore';
import { Navigate } from 'react-router-dom';
import type { EventType } from '../lib/types';
import CameraPanel from '../components/CameraPanel';
import EmployeeSidebar from '../components/EmployeeSidebar';
import { useMonitorWS } from '../hooks/useMonitorWS';
import { Clock, Coffee, LogIn, LogOut, AlertTriangle } from 'lucide-react';

export default function EmployeeView() {
  const { user, isAuthenticated, token } = useAuthStore();
  const { getEmployeeTeam, fetchMyTeam } = useTeamStore();
  
  // Zustand 스토어 연동
  const { commuteStatus, checkInTime, checkOutTime, checkIn, checkOut } = useCommuteStore();
  const { isAway, currentReason, awayStartTime, awayStartTimeMs, startAway, stopAway } = useAwayStore();

  useEffect(() => {
    fetchMyTeam();
  }, [fetchMyTeam]);

  const [currentStatus, setCurrentStatus] = useState<EventType>('NORMAL');
  const [prevStatus, setPrevStatus] = useState<EventType>('NORMAL');
  const [confidence, setConfidence] = useState(95);
  const [statusLog, setStatusLog] = useState<{ status: EventType; time: string; confidence: number }[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // 스마트 자리비움 관련 상태
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<AwayReason>('화장실');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isLunchTime, setIsLunchTime] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentStatusRef = useRef<EventType>('NORMAL');

  const team = user?.id ? getEmployeeTeam(user.id) : undefined;
  const now = () => new Date().toLocaleTimeString('ko-KR');

  // WebSocket Hook
  const { sendFrame, wsReady, error, lastResult } = useMonitorWS(isMonitoring, user?.id || 0, token);

  // 브라우저 알림 권한 획득
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        void Notification.requestPermission();
      }
    }
  }, []);

  // 1초 주기 타이머 (현재 시간 갱신, 점심시간 검사, 15분 경과 알림 검사)
  useEffect(() => {
    const timer = setInterval(() => {
      const nowTime = new Date();
      setCurrentTime(nowTime);

      // 점심시간 체크 (12:00 ~ 13:00)
      const hours = nowTime.getHours();
      const isLunch = hours === 12;
      setIsLunchTime(isLunch);

      // 15분 초과 체크 (15분 = 900,000ms)
      if (isAway && awayStartTimeMs) {
        const elapsedMs = nowTime.getTime() - awayStartTimeMs;
        const limitMs = 15 * 60 * 1000; 
        if (elapsedMs >= limitMs) {
          setShowWarningModal(true);
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('장기 부재 감지', {
              body: '현재 자리비움 중입니다. 업무에 복귀하셨다면 해제 버튼을 눌러주세요.',
              tag: 'long-away-alert'
            });
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isAway, awayStartTimeMs]);

  // 점심시간 시작 시 자리비움 자동 해제 및 차단
  useEffect(() => {
    if (isLunchTime && isAway) {
      stopAway();
    }
  }, [isLunchTime, isAway, stopAway]);



  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch {
      alert('카메라 권한이 필요합니다.');
      setIsMonitoring(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // 카메라 켜고 끄기
  useEffect(() => {
    if (isMonitoring) {
      void Promise.resolve().then(startCamera);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isMonitoring, startCamera, stopCamera]);

  // 주기적으로 프레임 캡처 및 전송
  const captureAndSend = useCallback(() => {
    if (!videoRef.current || !wsReady) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const base64 = dataUrl.split(',')[1];
    if (base64) {
      sendFrame(base64);
    }
  }, [sendFrame, wsReady]);

  useEffect(() => {
    if (!isMonitoring || !wsReady) return;
    const interval = setInterval(captureAndSend, 250); // 약 4fps
    return () => clearInterval(interval);
  }, [isMonitoring, wsReady, captureAndSend]);

  // 웹소켓 결과 수신 처리
  useEffect(() => {
    if (lastResult) {
      if (currentStatusRef.current !== lastResult.state) {
        setPrevStatus(currentStatusRef.current);
        setCurrentStatus(lastResult.state);
        currentStatusRef.current = lastResult.state;
        
        setStatusLog(logs => [
          { status: lastResult.state, time: now(), confidence: lastResult.confidence * 100 },
          ...logs.slice(0, 19)
        ]);
      }
      
      setConfidence(Math.round(lastResult.confidence * 100));
    }
  }, [lastResult]);

  const handleToggleMonitoring = useCallback(() => {
    if (commuteStatus !== 'WORK') {
      alert('출근 버튼을 먼저 눌러주세요.');
      return;
    }
    if (isMonitoring) {
      setCurrentStatus('NORMAL');
      setPrevStatus('NORMAL');
      currentStatusRef.current = 'NORMAL';
      setConfidence(95);
      setIsMonitoring(false);
      return;
    }
    setIsMonitoring(true);
  }, [isMonitoring, commuteStatus]);

  // 출근 처리
  const handleCheckIn = () => {
    if (user) {
      checkIn(user.id, user.username);
    }
  };

  // 퇴근 처리
  const handleCheckOut = () => {
    if (user && confirm('정말 퇴근하시겠습니까? 퇴근 시 모니터링이 자동 종료됩니다.')) {
      setIsMonitoring(false);
      if (isAway) {
        stopAway();
      }
      checkOut(user.id, user.username);
    }
  };

  // 자리비움 시작 버튼 클릭
  const handleAwayClick = () => {
    if (isLunchTime) {
      alert('점심시간(12:00 ~ 13:00)에는 자리비움 기능을 사용할 수 없습니다.');
      return;
    }
    setIsReasonModalOpen(true);
  };

  // 사유 모달 제출
  const handleConfirmAway = () => {
    if (user) {
      startAway(user.id, user.username, selectedReason);
      setIsReasonModalOpen(false);
      setIsMonitoring(false);
    }
  };

  // 복귀 처리
  const handleReturnWork = () => {
    stopAway();
    setShowWarningModal(false);
  };

  if (!isAuthenticated || user?.role !== 'EMPLOYEE') {
    return <Navigate to="/login" replace />;
  }

  if (!team) {
    return <Navigate to="/join-team" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-36 pb-12 px-6">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">내 근무 모니터링</h1>
            <p className="text-slate-500 text-sm mt-1">안녕하세요, {user.username}님. AI가 실시간으로 상태를 분석합니다.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 flex items-center gap-2 text-slate-400 text-sm self-start md:self-auto">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>현재 시각: {currentTime.toLocaleTimeString('ko-KR')}</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* ──── 출퇴근 및 자리비움 통합 컨트롤 패널 ──── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 출퇴근 섹션 */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400 font-medium flex items-center gap-2 text-sm">
                  <LogIn className="w-4 h-4 text-emerald-400" /> 출퇴근 상태
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  commuteStatus === 'WORK' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  commuteStatus === 'LEAVE' ? 'bg-slate-800 text-slate-400' :
                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {commuteStatus === 'WORK' ? '근무 중' : commuteStatus === 'LEAVE' ? '퇴근 완료' : '출근 전'}
                </span>
              </div>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">출근 시간</span>
                  <span className="text-slate-300 font-medium">{checkInTime || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">퇴근 시간</span>
                  <span className="text-slate-300 font-medium">{checkOutTime || '-'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleCheckIn}
                disabled={commuteStatus === 'WORK'}
                className="flex-1 py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium text-sm transition duration-200 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" /> 출근하기
              </button>
              <button
                onClick={handleCheckOut}
                disabled={commuteStatus !== 'WORK'}
                className="flex-1 py-3 px-4 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium text-sm transition duration-200 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> 퇴근하기
              </button>
            </div>
          </div>

          {/* 수동 자리비움 섹션 */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400 font-medium flex items-center gap-2 text-sm">
                  <Coffee className="w-4 h-4 text-indigo-400" /> 자리비움 관리
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isAway ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-500'
                }`}>
                  {isAway ? `자리비움 중 (${currentReason})` : '정상 근무'}
                </span>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">외출 시작 시각</span>
                  <span className="text-slate-300 font-medium">{awayStartTime || '-'}</span>
                </div>
                {isLunchTime && (
                  <p className="text-amber-400/80 text-xs mt-2 flex items-center gap-1.5 bg-amber-500/5 p-2 rounded border border-amber-500/10">
                    <AlertTriangle className="w-3.5 h-3.5" /> 점심시간 (12:00 ~ 13:00) 동안은 자리비움 기능이 제한됩니다.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              {isAway ? (
                <button
                  onClick={handleReturnWork}
                  className="w-full py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition duration-200 flex items-center justify-center gap-2"
                >
                  <Coffee className="w-4 h-4" /> 업무 복귀하기
                </button>
              ) : (
                <button
                  onClick={handleAwayClick}
                  disabled={commuteStatus !== 'WORK' || isLunchTime}
                  className="w-full py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/40 disabled:text-slate-600 text-slate-300 border border-slate-700 disabled:border-slate-800/20 font-medium text-sm transition duration-200 flex items-center justify-center gap-2"
                >
                  <Coffee className="w-4 h-4" /> 잠시 자리비움
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 메인 모니터링 영역 */}
        {commuteStatus === 'LEAVE' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl font-bold">✓</div>
            <h2 className="text-xl font-bold text-white">오늘 근무가 종료되었습니다.</h2>
            <p className="text-slate-500 text-sm">퇴근 처리가 완료되어 모니터링이 자동 중단되었습니다. 수고하셨습니다!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CameraPanel
              isMonitoring={isMonitoring}
              isConnected={wsReady}
              videoRef={videoRef}
              currentStatus={isAway ? 'AWAY' : currentStatus} // 자리비움 상태면 AWAY로 고정
              confidence={isAway ? 100 : confidence}
              onToggleMonitoring={handleToggleMonitoring}
            />

            <EmployeeSidebar
              username={user.username}
              balance={user.balance}
              prevStatus={prevStatus}
              statusLog={statusLog}
              teamName={team.name}
              teamCode={team.teamCode}
            />
          </div>
        )}
      </div>

      {/* ──── 사유 선택 모달 ──── */}
      {isReasonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Coffee className="w-5 h-5 text-indigo-400" /> 자리비움 사유 선택
            </h3>
            <p className="text-slate-400 text-xs mb-4">근태 데이터 관리를 위해 자리비움 사유를 등록해 주세요.</p>
            
            <div className="space-y-2 mb-6">
              {(['화장실', '수분 섭취', '단순 휴식', '기타'] as AwayReason[]).map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    selectedReason === reason
                      ? 'bg-indigo-600/10 border-indigo-500 text-white'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="away-reason"
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-indigo-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium">{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsReasonModalOpen(false)}
                className="flex-1 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition"
              >
                취소
              </button>
              <button
                onClick={handleConfirmAway}
                className="flex-1 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition"
              >
                선택 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── 15분 경고 모달 ──── */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/20 rounded-xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">장기 자리비움 감지</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              현재 자리비움 설정이 <span className="text-red-400 font-semibold">15분을 초과</span>했습니다.<br />
              업무에 복귀하셨다면 아래 복귀 버튼을 눌러주세요.
            </p>
            <button
              onClick={handleReturnWork}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20"
            >
              업무 복귀하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
