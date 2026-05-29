import { useState } from 'react';

interface ManagerPingModalProps {
  pingTarget: { id: number; name: string } | null;
  onClose: () => void;
  onSendPing: (memberId: number, message: string) => void;
}

export default function ManagerPingModal({
  pingTarget,
  onClose,
  onSendPing
}: ManagerPingModalProps) {
  const [pingMessage, setPingMessage] = useState('');

  if (!pingTarget) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-red-400">⚠️</span> {pingTarget.name}님에게 디렉토링 경보 전송
        </h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          작성한 메시지가 해당 팀원의 화면에 풀스크린 빨간색 경고 오버레이와 경보음으로 즉시 노출됩니다.
        </p>
        <textarea
          rows={3}
          value={pingMessage}
          onChange={(e) => setPingMessage(e.target.value)}
          placeholder="예: 자리를 비우신 것 같습니다. 확인 부탁드립니다."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500 transition duration-200 resize-none mb-4"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              onClose();
              setPingMessage('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold cursor-pointer"
          >
            취소
          </button>
          <button
            disabled={!pingMessage.trim()}
            onClick={() => {
              onSendPing(pingTarget.id, pingMessage);
              alert(`${pingTarget.name}님에게 경보를 전송했습니다.`);
              onClose();
              setPingMessage('');
            }}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold transition cursor-pointer"
          >
            경보 발송
          </button>
        </div>
      </div>
    </div>
  );
}
