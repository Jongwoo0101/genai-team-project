import { useState } from 'react';
import * as api from '../lib/api';

interface InviteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteEmployeeModal({ isOpen, onClose, onSuccess }: InviteEmployeeModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!inviteCode.trim()) {
      setError('초대 코드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await api.addEmployeeByCode({ inviteCode: inviteCode.trim() });
      setSuccessMessage('직원이 성공적으로 팀에 추가되었습니다!');
      setTimeout(() => {
        onSuccess();
        onClose();
        setInviteCode('');
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || '직원 추가에 실패했습니다. 코드를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">직원 추가</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          {/* 설명 */}
          <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
            <p className="text-sm text-slate-300 leading-relaxed">
              직원이 생성한 <span className="text-cyan-400 font-bold">초대 코드</span>를 아래에 입력하면
              해당 직원이 내 팀에 추가됩니다.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 성공 메시지 */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* 초대 코드 입력 */}
          <div className="space-y-2">
            <label htmlFor="manager_invite_code" className="text-sm font-medium text-slate-300">
              초대 코드 <span className="text-red-400">*</span>
            </label>
            <input
              id="manager_invite_code"
              name="manager_invite_code"
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="예: WS-7A3F-X9K2"
              autoComplete="off"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white text-center text-lg font-mono tracking-widest placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
          </div>

          {/* 버튼 */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading || successMessage !== null}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                '추가하기'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
