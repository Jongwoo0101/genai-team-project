import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../lib/types';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [selectedRole, setSelectedRole] = useState<Role>('EMPLOYEE');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const success = login(email, password);
    if (success) {
      navigate(selectedRole === 'MANAGER' ? '/dashboard' : '/employee');
    } else {
      setError('등록되지 않은 이메일입니다. 아래 데모 계정을 클릭하세요.');
    }
    setIsLoading(false);
  };

  const demoAccounts = [
    { role: 'MANAGER' as Role, email: 'minsu@worksight.com', name: '김민수 (관리자)' },
    { role: 'EMPLOYEE' as Role, email: 'seoyeon@worksight.com', name: '이서연 (직원)' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-cyan-500/6 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-cyan-500/20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">WorkSight 로그인</h1>
          <p className="text-slate-400 text-sm">근무 모니터링 시스템에 접속합니다</p>
        </div>

        <div className="glass-card p-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">접속 유형</label>
            <div className="grid grid-cols-2 gap-3">
              {(['EMPLOYEE', 'MANAGER'] as Role[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border ${
                    selectedRole === role
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                      : 'bg-transparent border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {role === 'EMPLOYEE' ? '직원' : '관리자'}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">이메일</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@worksight.com" required
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all text-sm" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">비밀번호</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" required
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all text-sm" />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer">
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>

        <div className="mt-6 glass-card p-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <p className="text-xs font-medium text-slate-500 mb-3">데모 계정 (클릭하여 자동 입력)</p>
          <div className="space-y-2">
            {demoAccounts.map((acc) => (
              <button key={acc.email} type="button"
                onClick={() => { setEmail(acc.email); setPassword('demo'); setSelectedRole(acc.role); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/60 border border-transparent hover:border-slate-700 transition-all cursor-pointer text-left">
                <span className="text-sm text-slate-300">{acc.name}</span>
                <span className="text-xs text-slate-500 font-mono">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
