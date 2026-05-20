import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTeamStore } from '../store/teamStore';
import { Navigate } from 'react-router-dom';
import type { EventType } from '../lib/types';
import CameraPanel from '../components/CameraPanel';
import EmployeeSidebar from '../components/EmployeeSidebar';
import { useMonitorWS } from '../hooks/useMonitorWS';

export default function EmployeeView() {
  const { user, isAuthenticated, token } = useAuthStore();
  const { getEmployeeTeam, fetchMyTeam } = useTeamStore();

  useEffect(() => {
    fetchMyTeam();
  }, [fetchMyTeam]);

  const [currentStatus, setCurrentStatus] = useState<EventType>('NORMAL');
  const [prevStatus, setPrevStatus] = useState<EventType>('NORMAL');
  const [confidence, setConfidence] = useState(95);
  const [statusLog, setStatusLog] = useState<{ status: EventType; time: string; confidence: number }[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentStatusRef = useRef<EventType>('NORMAL');

  const team = user?.id ? getEmployeeTeam(user.id) : undefined;
  const now = () => new Date().toLocaleTimeString('ko-KR');

  // WebSocket Hook
  const { sendFrame, wsReady, error, lastResult } = useMonitorWS(isMonitoring, user?.id || 0, token);

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
    if (isMonitoring) {
      setCurrentStatus('NORMAL');
      setPrevStatus('NORMAL');
      currentStatusRef.current = 'NORMAL';
      setConfidence(95);
      setIsMonitoring(false);
      return;
    }
    setIsMonitoring(true);
  }, [isMonitoring]);

  if (!isAuthenticated || user?.role !== 'EMPLOYEE') {
    return <Navigate to="/login" replace />;
  }

  if (!team) {
    return <Navigate to="/join-team" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-36 pb-12 px-6">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">내 근무 모니터링</h1>
          <p className="text-slate-500 text-sm mt-1">안녕하세요, {user.username}님. AI가 실시간으로 상태를 분석합니다.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CameraPanel
            isMonitoring={isMonitoring}
            isConnected={wsReady}
            videoRef={videoRef}
            currentStatus={currentStatus}
            confidence={confidence}
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
      </div>
    </div>
  );
}
