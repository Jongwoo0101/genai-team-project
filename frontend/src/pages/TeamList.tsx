import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../domains/auth/stores/authStore';
import { useTeamStore } from '../domains/team/stores/teamStore';
import CreateTeamModal from '../components/CreateTeamModal';

export default function TeamList() {
  const { user, isAuthenticated } = useAuthStore();
  const { getTeamsByManager, deleteTeam, fetchTeamMembers } = useTeamStore();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchTeamMembers(user.id);
    }
  }, [user?.id, fetchTeamMembers]);

  if (!isAuthenticated || user?.role !== 'MANAGER') {
    return <Navigate to="/login" replace />;
  }

  const teams = getTeamsByManager(user.id);

  const handleDeleteTeam = (teamId: string) => {
    deleteTeam(teamId, user.id);
    setDeleteConfirmId(null);
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-6 pb-12 px-6">
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-bold text-white">내 팀 관리</h1>
            <p className="text-slate-500 text-sm mt-1">{user.username}님, 팀을 만들고 직원을 관리하세요.</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            새 팀 만들기
          </button>
        </div>

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 animate-fade-in-up">
            <div className="w-20 h-20 rounded-2xl bg-slate-900/50 border border-white/5 flex items-center justify-center mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-300 mb-2">아직 팀이 없습니다</h3>
            <p className="text-sm text-slate-500 mb-8 text-center max-w-sm">
              새 팀을 만들고 팀 코드를 직원에게 공유하면,<br />직원이 코드를 입력해 팀에 합류할 수 있습니다.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              첫 팀 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((team, idx) => (
              <div
                key={team.id}
                className="group rounded-2xl bg-slate-900/50 border border-white/5 hover:border-cyan-500/20 hover:bg-slate-900/70 transition-all duration-300 overflow-hidden animate-fade-in-up cursor-pointer"
                style={{ animationDelay: `${idx * 0.05}s` }}
                onClick={() => navigate(`/teams/${team.id}`)}
              >
                {/* Card Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-cyan-500/20">
                      {team.name.charAt(0)}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* 삭제 버튼 */}
                      {deleteConfirmId === team.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                          >
                            삭제
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(team.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                          title="팀 삭제"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-lg mb-1 group-hover:text-cyan-400 transition-colors">{team.name}</h3>
                  {team.description && (
                    <p className="text-slate-500 text-xs line-clamp-2 mb-3">{team.description}</p>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3.5 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* 멤버 수 */}
                    <div className="flex items-center gap-1.5">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      </svg>
                      <span className="text-xs font-bold text-slate-400">{team.members.length}명</span>
                    </div>
                    {/* 생성일 */}
                    <span className="text-[10px] text-slate-600 font-mono">{formatDate(team.createdAt)}</span>
                  </div>

                  {/* 팀 코드 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCopyCode(team.teamCode); }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/5 border border-cyan-500/10 hover:bg-cyan-500/10 transition-colors cursor-pointer group/code"
                    title="클릭하여 코드 복사"
                  >
                    <span className="text-[11px] font-mono font-bold text-cyan-400 tracking-wider">{team.teamCode}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-500/50 group-hover/code:text-cyan-400 transition-colors">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Team Modal */}
        <CreateTeamModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {}}
        />
      </div>
    </div>
  );
}
