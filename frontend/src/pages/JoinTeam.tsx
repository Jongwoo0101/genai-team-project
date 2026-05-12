import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTeamStore } from '../store/teamStore';
import * as api from '../lib/api';

export default function JoinTeam() {
  const { user, isAuthenticated } = useAuthStore();
  const { joinTeam, getEmployeeTeam, fetchMyTeam } = useTeamStore();
  const navigate = useNavigate();

  useEffect(() => {
    // 마운트 시점에 서버에서 내 팀 정보가 있는지 확인
    fetchMyTeam();
  }, [fetchMyTeam]);

  const [teamCode, setTeamCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [successTeam, setSuccessTeam] = useState<string | null>(null);

  if (!isAuthenticated || user?.role !== 'EMPLOYEE') {
    return <Navigate to="/login" replace />;
  }

  // 이미 팀에 소속되어 있으면 직원 모니터링 화면으로
  const existingTeam = getEmployeeTeam(user.id);
  if (existingTeam && !successTeam) {
    return <Navigate to="/employee" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const code = teamCode.trim().toUpperCase();
    if (!code) {
      setError('팀 코드를 입력해주세요.');
      return;
    }

    setIsJoining(true);

    try {
      // 1) 백엔드 API 호출 시도
      await api.joinTeam({ inviteCode: code });
      // API 성공 → localStorage에도 동기화
      joinTeam(code, user.id, user.username);
      setSuccessTeam('팀');
      setTimeout(() => navigate('/employee'), 1500);
    } catch (err: unknown) {
      const serverMsg = err instanceof Error ? err.message : '';
      
      // 서버가 명확한 비즈니스 에러를 반환한 경우 (400, 401 등) → 그대로 표시
      if (serverMsg && !serverMsg.startsWith('Failed to fetch') && !serverMsg.includes('NetworkError')) {
        setError(serverMsg);
      } else {
        // 네트워크 에러 → localStorage 폴백 시도
        const result = joinTeam(code, user.id, user.username);
        if (result.success) {
          setSuccessTeam(result.teamName || '팀');
          setTimeout(() => navigate('/employee'), 1500);
        } else {
          setError(result.error || '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
        }
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-xl shadow-cyan-500/20 mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
            팀에 참여하기
          </h1>
          <p className="text-slate-400 font-medium">
            관리자에게 받은 팀 코드를 입력하세요
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-10 shadow-2xl animate-fade-in-up delay-100">
          {successTeam ? (
            /* 성공 화면 */
            <div className="text-center animate-fade-in-up">
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">팀 참여 완료!</h2>
              <p className="text-slate-400 text-sm">
                성공적으로 합류했습니다.
              </p>
              <p className="text-slate-500 text-xs mt-3">잠시 후 모니터링 화면으로 이동합니다...</p>
            </div>
          ) : (
            /* 코드 입력 폼 */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 안내 */}
              <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    관리자가 팀을 생성하면 <span className="text-cyan-400 font-bold">초대 코드</span>가 발급됩니다.
                    해당 코드를 입력하면 팀에 합류하여 모니터링을 시작할 수 있습니다.
                  </p>
                </div>
              </div>

              {/* 코드 입력 필드 */}
              <div className="space-y-2">
                <label htmlFor="join_team_code" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  팀 코드
                </label>
                <input
                  id="join_team_code"
                  type="text"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  placeholder="WS-XXXX-XXXX"
                  maxLength={15}
                  autoComplete="off"
                  autoFocus
                  className="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-white text-center text-xl font-mono font-bold tracking-wider placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all duration-200"
                />
              </div>

              {/* 에러 */}
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium animate-shake">
                  {error}
                </div>
              )}

              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={isJoining || teamCode.trim().length < 1}
                className="btn-primary w-full flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>팀 참여하기</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-slate-600 mt-6 animate-fade-in-up delay-200">
          {user.username}님으로 로그인 중 · 팀 코드가 없으면 관리자에게 문의하세요
        </p>
      </div>
    </div>
  );
}
