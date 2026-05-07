import { useState, useEffect } from 'react';
import type { EventType } from '../lib/types';
import { eventTypeLabels, eventTypeColors } from '../lib/mockData';
import * as api from '../lib/api';

interface StatusLogEntry {
  status: EventType;
  time: string;
  confidence: number;
}

interface EmployeeSidebarProps {
  username: string;
  balance: number;
  prevStatus: EventType;
  statusLog: StatusLogEntry[];
}

export default function EmployeeSidebar({
  username,
  balance,
  prevStatus,
  statusLog
}: EmployeeSidebarProps) {
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // 초대 코드 만료 타이머
  useEffect(() => {
    if (timeLeft === null) return;
    
    if (timeLeft <= 0) {
      setGeneratedCode(null);
      setTimeLeft(null);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const result = await api.generateInviteCode();
      setGeneratedCode(result.inviteCode);
    } catch {
      const code = 'WS-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      setGeneratedCode(code);
    } finally {
      setIsGenerating(false);
      setTimeLeft(300); // 5분 (300초) 설정
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopy = async () => {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="lg:col-span-1 flex flex-col gap-4">
      {/* Profile Card */}
      <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-5">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">내 정보</h3>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-cyan-500/20">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-bold">{username}</p>
            <p className="text-slate-500 text-xs">직원</p>
          </div>
        </div>
        <div className="space-y-2.5">
          <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-500">가상 포인트</span>
            <span className="text-sm font-bold text-cyan-400">💰 {balance.toLocaleString()} P</span>
          </div>
          <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-xs text-slate-500">이전 상태</span>
            <span className={`text-xs font-bold ${eventTypeColors[prevStatus].text}`}>{eventTypeLabels[prevStatus]}</span>
          </div>
        </div>
      </div>

      {/* Invite Code Card */}
      <div className="rounded-2xl bg-slate-900/50 border border-white/5 p-5 relative group">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">초대 코드</h3>
          {generatedCode && (
            <button
              onClick={() => { setGeneratedCode(null); setTimeLeft(null); }}
              className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
              title="코드 무효화"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              취소
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          아래 버튼을 눌러 초대 코드를 생성하고,<br />관리자에게 전달해주세요.
        </p>

        {generatedCode ? (
          <div className="space-y-3">
            <div className="relative px-4 py-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-center overflow-hidden">
              {/* Progress bar background for timer */}
              <div 
                className="absolute bottom-0 left-0 h-0.5 bg-cyan-500/30 transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft || 0) / 300 * 100}%` }}
              />
              
              <p className="text-lg font-mono font-bold text-cyan-400 tracking-widest select-all mb-1">
                {generatedCode}
              </p>
              {timeLeft !== null && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                  만료까지 {formatTime(timeLeft)}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white hover:bg-white/10"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  복사됨!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  코드 복사
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGenerateCode}
            disabled={isGenerating}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                초대 코드 생성
              </>
            )}
          </button>
        )}
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
  );
}
