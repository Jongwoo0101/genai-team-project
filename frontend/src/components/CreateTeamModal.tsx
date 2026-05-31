import { useState } from 'react';
import { useTeamStore } from '../domains/team/stores/teamStore';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTeamModal({ isOpen, onClose, onSuccess }: CreateTeamModalProps) {
  // [변경] createTeamFromServer 사용 — 서버 API 호출 + 로컬 상태 업데이트를 한 번에 처리
  const createTeamFromServer = useTeamStore((s) => s.createTeamFromServer);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setError(null);
    if (!teamName.trim()) {
      setError('팀 이름을 입력해주세요.');
      return;
    }

    setIsCreating(true);
    try {
      // [변경] createTeamFromServer 한 번 호출로 서버 API + 로컬 상태 모두 처리
      // 내부적으로 POST /api/teams 호출 → teamId, inviteCode 반환
      const { inviteCode } = await createTeamFromServer(
        teamName.trim(),
        teamDescription.trim()
      );
      setCreatedCode(inviteCode);
    } catch (err: unknown) {
      const serverMsg = err instanceof Error ? err.message : '팀 생성 중 오류가 발생했습니다.';
      console.error('팀 생성 실패:', serverMsg);
      setError(serverMsg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdCode) return;
    await navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setTeamName('');
    setTeamDescription('');
    setCreatedCode(null);
    setError(null);
    setCopied(false);
    if (createdCode) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            새 팀 만들기
          </h2>
          <button type="button" onClick={handleClose} aria-label="닫기" title="닫기"
            className="text-slate-400 hover:text-white transition-colors cursor-pointer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {!createdCode ? (
            <>
              <div className="space-y-2">
                <label htmlFor="team_name" className="text-sm font-medium text-slate-300">
                  팀 이름 <span className="text-red-400">*</span>
                </label>
                <input id="team_name" type="text" value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="예: 개발 1팀" className="input-field" autoFocus />
              </div>

              <div className="space-y-2">
                <label htmlFor="team_desc" className="text-sm font-medium text-slate-300">
                  팀 설명 <span className="text-slate-600 text-xs">(선택)</span>
                </label>
                <textarea id="team_desc" value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="팀에 대한 간단한 설명을 입력하세요"
                  rows={3} className="input-field resize-none" />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={handleClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors cursor-pointer">
                  취소
                </button>
                <button type="button" onClick={handleCreate} disabled={isCreating}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:shadow-lg hover:shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      팀 생성
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-5 animate-fade-in-up">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-emerald-400 font-bold text-sm">팀이 생성되었습니다!</p>
                <p className="text-slate-400 text-xs mt-1">아래 코드를 팀원에게 공유하세요</p>
              </div>

              <div className="p-5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-2 font-bold">팀 참여 코드</p>
                <p className="text-3xl font-mono font-black text-cyan-400 tracking-[0.3em] select-all">
                  {createdCode}
                </p>
              </div>

              <button type="button" onClick={handleCopy}
                className="w-full px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white hover:bg-white/10">
                {copied ? (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>복사됨!</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>코드 복사</>
                )}
              </button>

              <button type="button" onClick={handleClose}
                className="w-full px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors cursor-pointer">
                확인
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}