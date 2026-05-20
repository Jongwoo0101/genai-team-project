import React from 'react';
import type { AiStatusType } from '../lib/types';
import { statusTypeLabels, statusTypeColors } from '../lib/mockData';

interface CameraPanelProps {
  isMonitoring: boolean;
  isConnected?: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentStatus: AiStatusType;
  confidence: number;
  onToggleMonitoring: () => void;
}

export default function CameraPanel({
  isMonitoring,
  isConnected,
  videoRef,
  currentStatus,
  confidence,
  onToggleMonitoring
}: CameraPanelProps) {
  const sc = statusTypeColors[currentStatus];

  return (
    <div className="lg:col-span-2 rounded-2xl bg-slate-900/50 border border-white/5 overflow-hidden">
      {/* Card Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${isMonitoring ? (isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400 animate-pulse') : 'bg-slate-600'}`} />
          <span className="text-sm font-bold text-slate-300 tracking-wide">
            {isMonitoring ? (isConnected ? 'AI 서버 연결됨' : 'AI 서버 연결 중...') : '대기 중'}
          </span>
        </div>
        {isMonitoring && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-white/5">
            <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
            <span className={`text-xs font-bold ${sc.text}`}>{statusTypeLabels[currentStatus]}</span>
            <span className="text-xs text-slate-600 ml-1">{confidence}%</span>
          </div>
        )}
      </div>

      {/* Video Area */}
      <div className="relative bg-slate-950 aspect-video">
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
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-scan z-10" />
            {/* Bottom overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
              <div className="flex items-end justify-between">
                <div className={`px-4 py-3 rounded-xl ${sc.bg} border border-white/10 backdrop-blur-md`}>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">AI Status</p>
                  <p className={`text-lg font-black ${sc.text}`}>{statusTypeLabels[currentStatus]}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="w-28 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                    <div className={`h-full bg-cyan-500 transition-all duration-700 w-conf-${confidence}`} />
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
          onClick={onToggleMonitoring}
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
  );
}
