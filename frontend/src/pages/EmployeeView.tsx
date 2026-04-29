import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import type { EventType } from '../lib/types';
import { eventTypeLabels, eventTypeColors } from '../lib/mockData';

/** 상태 변화 감지 시뮬레이션 - 파이프라인 3단계 핵심 로직 */
const STATUS_CYCLE: EventType[] = ['NORMAL', 'NORMAL', 'DROWSINESS', 'NORMAL', 'PHONE_USE', 'NORMAL', 'ABSENCE', 'NORMAL'];

export default function EmployeeView() {
  const { user, isAuthenticated } = useAuthStore();
  const [currentStatus, setCurrentStatus] = useState<EventType>('NORMAL');
  const [prevStatus, setPrevStatus] = useState<EventType>('NORMAL');
  const [confidence, setConfidence] = useState(95);
  const [statusLog, setStatusLog] = useState<{ status: EventType; time: string; confidence: number }[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);

  // 인증 체크
  if (!isAuthenticated || user?.role !== 'EMPLOYEE') {
    return <Navigate to="/login" replace />;
  }

  const now = () => new Date().toLocaleTimeString('ko-KR');

  // 상태 변화 감지 최적화 로직 (파이프라인 3단계)
  // 이전 상태와 다를 때만 로그에 기록
  const detectStateChange = useCallback((newStatus: EventType) => {
    setCurrentStatus((prev) => {
      if (prev !== newStatus) {
        setPrevStatus(prev);
        setStatusLog((logs) => [
          { status: newStatus, time: now(), confidence: Math.floor(80 + Math.random() * 18) },
          ...logs.slice(0, 19),
        ]);
      }
      return newStatus;
    });
    setConfidence(Math.floor(80 + Math.random() * 18));
  }, []);

  // 모니터링 시뮬레이션 타이머
  useEffect(() => {
    if (!isMonitoring) return;
    const interval = setInterval(() => {
      setCycleIndex((i) => {
        const next = (i + 1) % STATUS_CYCLE.length;
        detectStateChange(STATUS_CYCLE[next]);
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [isMonitoring, detectStateChange]);

  const statusColor = eventTypeColors[currentStatus];

  return (
    <div className="min-h-screen px-6 py-24">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-white mb-2">근무 모니터링</h1>
          <p className="text-slate-400">안녕하세요, {user.name}님. AI가 근무 상태를 분석하고 있습니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 웹캠 프리뷰 영역 */}
          <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isMonitoring ? 'bg-emerald-400 animate-pulse-dot' : 'bg-slate-600'}`} />
                  <span className="text-sm font-medium text-slate-300">
                    {isMonitoring ? '모니터링 중' : '대기 중'}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-mono">{user.department}</span>
              </div>

              {/* 웹캠 시뮬레이션 */}
              <div className="aspect-video bg-slate-900 flex items-center justify-center relative">
                {isMonitoring ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                    <div className="text-center z-10">
                      <div className="w-24 h-24 rounded-full border-4 border-slate-700 bg-slate-800 flex items-center justify-center mx-auto mb-4">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <p className="text-slate-500 text-sm">웹캠 영상 영역</p>
                      <p className="text-slate-600 text-xs mt-1">(추후 실제 카메라 연동)</p>
                    </div>
                    {/* Status overlay */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusColor.bg}`}>
                        <div className={`w-2 h-2 rounded-full ${statusColor.dot} animate-pulse-dot`} />
                        <span className={`text-sm font-medium ${statusColor.text}`}>{eventTypeLabels[currentStatus]}</span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">신뢰도: {confidence}%</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" className="mx-auto mb-3">
                      <path d="M23 7l-7 5 7 5V7z" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                    <p className="text-slate-500 text-sm">모니터링을 시작하려면 아래 버튼을 클릭하세요</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4">
                <button
                  onClick={() => {
                    setIsMonitoring(!isMonitoring);
                    if (!isMonitoring) {
                      setCurrentStatus('NORMAL');
                      setConfidence(95);
                    }
                  }}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
                    isMonitoring
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/20'
                  }`}
                >
                  {isMonitoring ? '모니터링 중지' : '모니터링 시작'}
                </button>
              </div>
            </div>
          </div>

          {/* 상태 정보 사이드바 */}
          <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {/* Current Status Card */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">현재 상태</h3>
              <div className={`p-4 rounded-xl ${statusColor.bg} text-center mb-4`}>
                <p className={`text-2xl font-bold ${statusColor.text}`}>{eventTypeLabels[currentStatus]}</p>
                <p className="text-xs text-slate-500 mt-1">신뢰도 {confidence}%</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">이름</span>
                  <span className="text-slate-300">{user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">부서</span>
                  <span className="text-slate-300">{user.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">이전 상태</span>
                  <span className={eventTypeColors[prevStatus].text}>{eventTypeLabels[prevStatus]}</span>
                </div>
              </div>
            </div>

            {/* Status Change Log */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">상태 변화 로그</h3>
              {statusLog.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">아직 상태 변화가 없습니다</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {statusLog.map((log, i) => {
                    const c = eventTypeColors[log.status];
                    return (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                          <span className={`text-xs font-medium ${c.text}`}>{eventTypeLabels[log.status]}</span>
                        </div>
                        <span className="text-xs text-slate-600 font-mono">{log.time}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
