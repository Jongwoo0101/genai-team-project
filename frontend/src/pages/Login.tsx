import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../lib/types';

type AuthMode = 'login' | 'signup';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const signUp = useAuthStore((s) => s.signUp);

  const [mode, setMode] = useState<AuthMode>('login');
  const [selectedRole, setSelectedRole] = useState<Role>('EMPLOYEE');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    if (mode === 'login') {
      const result = await login(username, password);
      if (result.success) {
        const role = useAuthStore.getState().user?.role;
        navigate(role === 'MANAGER' ? '/dashboard' : '/employee');
      } else {
        setError(result.error || '로그인에 실패했습니다.');
      }
    } else {
      const result = await signUp(username, password, selectedRole);
      if (result.success) {
        const role = useAuthStore.getState().user?.role;
        navigate(role === 'MANAGER' ? '/dashboard' : '/employee');
      } else {
        setError(result.error || '회원가입에 실패했습니다.');
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-xl shadow-cyan-500/20 mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
            {mode === 'login' ? 'WorkSight 시작하기' : '새 계정 만들기'}
          </h1>
          <p className="text-slate-400 font-medium">
            {mode === 'login' ? 'AI 기반 스마트 근무 모니터링 시스템' : '직원 또는 관리자로 가입하세요'}
          </p>
        </div>

        {/* Auth Tabs */}
        <div className="glass-card p-1.5 mb-6 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <div className="grid grid-cols-2 gap-2">
            {(['login', 'signup'] as AuthMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className={`py-3 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer border-0 ${
                  mode === m
                    ? 'bg-cyan-500/15 text-cyan-400 glow-cyan'
                    : 'bg-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {m === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-10 shadow-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {/* Role Selector (Signup only) */}
          {mode === 'signup' && (
            <div className="mb-8">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">계정 유형 선택</label>
              <div className="grid grid-cols-2 gap-4">
                {(['EMPLOYEE', 'MANAGER'] as Role[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`py-4 px-4 rounded-2xl text-sm font-bold transition-all duration-300 cursor-pointer border-2 ${
                      selectedRole === role
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                        : 'bg-slate-800/20 border-transparent text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    {role === 'EMPLOYEE' ? '👤 직원' : '👔 관리자'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">아이디</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디"
                required
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">비밀번호</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-field"
              />
            </div>

            {mode === 'signup' && (
              <div className="space-y-2 animate-fade-in-up">
                <label htmlFor="confirmPassword" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">비밀번호 확인</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-field"
                />
              </div>
            )}

            {error && (
              <div className="px-5 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? '로그인' : '회원가입 시작'}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
