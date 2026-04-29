import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Navbar() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            Work<span className="text-cyan-400">Sight</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          <Link
            to="/"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 no-underline ${
              isActive('/')
                ? 'text-cyan-400 bg-cyan-400/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            홈
          </Link>

          {isAuthenticated && user?.role === 'EMPLOYEE' && (
            <Link
              to="/employee"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 no-underline ${
                isActive('/employee')
                  ? 'text-cyan-400 bg-cyan-400/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              근무 모니터링
            </Link>
          )}

          {isAuthenticated && user?.role === 'MANAGER' && (
            <Link
              to="/dashboard"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 no-underline ${
                isActive('/dashboard')
                  ? 'text-cyan-400 bg-cyan-400/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              대시보드
            </Link>
          )}
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-white leading-none">{user.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {user.role === 'MANAGER' ? '관리자' : '직원'}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-slate-700 hover:text-white hover:border-slate-500 transition-all duration-200 cursor-pointer bg-transparent"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 transition-all duration-200 no-underline shadow-lg shadow-cyan-500/20"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
