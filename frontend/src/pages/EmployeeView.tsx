import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import * as api from '../lib/api';
import type { EventType } from '../lib/types';
import { eventTypeLabels, eventTypeColors } from '../lib/mockData';

const STATUS_CYCLE: EventType[] = ['NORMAL', 'NORMAL', 'SLEEP', 'NORMAL', 'SMARTPHONE', 'NORMAL', 'AWAY', 'NORMAL', 'DISTRACTED', 'NORMAL'];

export default function EmployeeView() {
  const { user, isAuthenticated } = useAuthStore();
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

        // [추가] 백엔드 서버에 상태 변화 보고
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

  const sc = eventTypeColors[currentStatus];

  return (
    <div className="min-h-screen bg-slate-950 pt-36 pb-12 px-6">
      <div className="max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">내 근무 모니터링</h1>
          <p className="text-slate-500 text-sm mt-1">안녕하세요, {user.username}님. AI가 실시간으로 상태를 분석합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Camera Panel */}
          <div className="lg:col-span-2 rounded-2xl bg-slate-900/50 border border-white/5 overflow-hidden">
            {/* Card Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${isMonitoring ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-sm font-bold text-slate-300 tracking-wide">
                  {isMonitoring ? 'AI 분석 활성' : '대기 중'}
                </span>
              </div>
              {isMonitoring && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-white/5">
                  <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                  <span className={`text-xs font-bold ${sc.text}`}>{eventTypeLabels[currentStatus]}</span>
                  <span className="text-xs text-slate-600 ml-1">{confidence}%</span>
                </div>
              )}
            </div>

            {/* Video Area */}
            <div className="relative bg-slate-950" style={{ aspectRatio: '16/9' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isMonitoring ? 'opacity-100' : 'opacity-0'}`}
              />

              {isMonitoring ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
                  {/* Scan line */}
                  <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-[scan_3s_linear_infinite] z-10" />
                  {/* Bottom overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                    <div className="flex items-end justify-between">
                      <div className={`px-4 py-3 rounded-xl ${sc.bg} border border-white/10 backdrop-blur-md`}>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">AI Status</p>
                        <p className={`text-lg font-black ${sc.text}`}>{eventTypeLabels[currentStatus]}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="w-28 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 transition-all duration-700" style={{ width: `${confidence}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-white/60">{confidence}% confidence</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5">
                      <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 font-semibold">카메라 준비 완료</p>
                    <p className="text-slate-600 text-sm mt-1">아래 버튼으로 모니터링을 시작하세요</p>
                  </div>
                </div>
              )}
            </div>

            {/* Start/Stop Button */}
            <div className="p-5">
              <button
                onClick={() => setIsMonitoring(!isMonitoring)}
                className={`w-full py-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer ${
                  isMonitoring
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40'
                }`}
              >
                {isMonitoring ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
                    <span>모니터링 종료</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    <span>AI 모니터링 시작</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 flex flex-col gap-4">

            {/* Profile Card */}
            <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-5">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">내 정보</h3>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-cyan-500/20">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-bold">{user.username}</p>
                  <p className="text-slate-500 text-xs">직원</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-xs text-slate-500">가상 포인트</span>
                  <span className="text-sm font-bold text-cyan-400">💰 {user.balance.toLocaleString()} P</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-xs text-slate-500">이전 상태</span>
                  <span className={`text-xs font-bold ${eventTypeColors[prevStatus].text}`}>{eventTypeLabels[prevStatus]}</span>
                </div>
              </div>
            </div>

            {/* Log Card */}
            <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-5 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">분석 로그</h3>
                <span className="text-[10px] text-slate-700 font-mono">최근 20건</span>
              </div>

              {statusLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-white/5 flex items-center justify-center opacity-50">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-600 text-center">모니터링을 시작하면<br />로그가 기록됩니다</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {statusLog.map((log, i) => {
                    const c = eventTypeColors[log.status];
                    return (
                      <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                          <span className={`text-xs font-bold ${c.text}`}>{eventTypeLabels[log.status]}</span>
                        </div>
                        <div className="flex items-center gap-2 text-right">
                          <span className="text-[10px] text-slate-700">{log.confidence}%</span>
                          <span className="text-[10px] text-slate-600 font-mono">{log.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      ` }} />
    </div>
  );
}
