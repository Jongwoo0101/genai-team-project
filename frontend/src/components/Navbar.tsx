import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../domains/auth/stores/authStore';
import { useTeamStore } from '../domains/team/stores/teamStore';

export default function Navbar() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { teams, memberTeamMap } = useTeamStore(); // memberTeamMap 추가

  // 상황에 맞는 정확한 teamId를 추출하는 똑똑한 로직
  const activeTeamId = (() => {
    if (!user) return '';

    // 1. 현재 URL 경로에 teamId가 있다면 최우선 사용 (관리자가 여러 팀을 전환하며 볼 때 필수)
    const match = location.pathname.match(/\/team\/([^/]+)/);
    if (match) return match[1];

    // 2. 직원의 경우 자신이 소속된 '진짜' 팀 ID를 사용
    if (user.role === 'EMPLOYEE') {
      return memberTeamMap[user.id] || teams[0]?.id || '';
    }

    // 3. 관리자가 홈 화면 등에 있을 때는 소유한 첫 번째 팀을 기본값으로 사용
    return teams[0]?.id || '';
  })();

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] px-8 py-6 pointer-events-none">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between px-8 py-4 glass-card glow-cyan pointer-events-auto bg-slate-950/40 border-white/10">
        <div className="flex items-center gap-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group no-underline">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-2xl font-black text-white tracking-tighter">Work<span className="text-cyan-400">Sight</span></span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-2">
            <NavLink to="/" label="홈" active={location.pathname === '/'} />
            <NavLink to="/features" label="핵심 솔루션" active={location.pathname === '/features'} />
            <NavLink to="/how-it-works" label="작동 원리" active={location.pathname === '/how-it-works'} />
            <NavLink to="/pricing" label="요금제" active={location.pathname === '/pricing'} />
            
            {isAuthenticated && user?.role === 'MANAGER' && (
              <NavLink to="/teams" label="팀 관리" active={location.pathname.startsWith('/teams') && !location.pathname.includes('/messages')} />
            )}
            {isAuthenticated && user?.role === 'EMPLOYEE' && (
              <NavLink to="/employee" label="내 모니터링" active={location.pathname === '/employee'} />
            )}
            {/*  정확한 teamId를 기반으로 메시지 링크 생성 */}
            {isAuthenticated && activeTeamId && (
              <NavLink to={`/team/${activeTeamId}/messages`} label="메시지" active={location.pathname.includes('/messages')} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {isAuthenticated && user ? (
            /* User Profile & Logout */
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end hidden lg:flex">
                <span className="text-xs font-bold text-slate-500 tracking-wider uppercase">{user.role}</span>
                <span className="text-sm font-bold text-white">{user.username}님</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-white text-sm font-bold shadow-inner group hover:border-cyan-500/50 transition-colors cursor-help" title="프로필 아바타">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={logout}
                className="p-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                title="로그아웃"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="btn-primary py-2.5 px-6 text-sm no-underline"
            >
              시작하기
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all no-underline ${
        active
          ? 'bg-cyan-500/10 text-cyan-400'
          : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
      }`}
    >
      {label}
    </Link>
  );
}