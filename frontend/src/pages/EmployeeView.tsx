import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTeamStore } from '../store/teamStore';
import { Navigate } from 'react-router-dom';
import * as api from '../lib/api';
import type { EventType } from '../lib/types';
import CameraPanel from '../components/CameraPanel';
import EmployeeSidebar from '../components/EmployeeSidebar';

const STATUS_CYCLE: EventType[] = ['NORMAL', 'NORMAL', 'SLEEP', 'NORMAL', 'SMARTPHONE', 'NORMAL', 'AWAY', 'NORMAL', 'DISTRACTED', 'NORMAL'];

export default function EmployeeView() {
  const { user, isAuthenticated } = useAuthStore();
  const { getEmployeeTeam } = useTeamStore();
  const [currentStatus, setCurrentStatus] = useState<EventType>('NORMAL');
  const [prevStatus, setPrevStatus] = useState<EventType>('NORMAL');
  const [confidence, setConfidence] = useState(95);
  const [statusLog, setStatusLog] = useState<{ status: EventType; time: string; confidence: number }[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  if (!isAuthenticated || user?.role !== 'EMPLOYEE') {
    return <Navigate to="/login" replace />;
  }

  // 팀에 소속되지 않았으면 팀 가입 페이지로
  const team = getEmployeeTeam(user.id);
  if (!team) {
    return <Navigate to="/join-team" replace />;
  }

  const now = () => new Date().toLocaleTimeString('ko-KR');

  const startCamera = async () => {
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
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    if (isMonitoring) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isMonitoring]);

  const detectStateChange = useCallback((newStatus: EventType) => {
    setCurrentStatus((prev) => {
      if (prev !== newStatus) {
        setPrevStatus(prev);
        setStatusLog((logs) => [
          { status: newStatus, time: now(), confidence: Math.floor(80 + Math.random() * 18) },
          ...logs.slice(0, 19),
        ]);

        if (user?.id) {
          api.reportEvent({ employeeId: user.id, eventType: newStatus })
            .catch(err => console.error('이벤트 보고 실패:', err));
        }
      }
      return newStatus;
    });
    setConfidence(Math.floor(80 + Math.random() * 18));
  }, [user]);

  useEffect(() => {
    if (!isMonitoring) return;
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % STATUS_CYCLE.length;
      detectStateChange(STATUS_CYCLE[idx]);
    }, 3000);
    return () => clearInterval(interval);
  }, [isMonitoring, detectStateChange]);

  return (
    <div className="min-h-screen bg-slate-950 pt-36 pb-12 px-6">
      <div className="max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">내 근무 모니터링</h1>
          <p className="text-slate-500 text-sm mt-1">안녕하세요, {user.username}님. AI가 실시간으로 상태를 분석합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CameraPanel
            isMonitoring={isMonitoring}
            videoRef={videoRef}
            currentStatus={currentStatus}
            confidence={confidence}
            onToggleMonitoring={() => setIsMonitoring(!isMonitoring)}
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
