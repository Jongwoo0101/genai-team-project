interface EmployeeDirectPingModalProps {
  ping: {
    id: string;
    fromName: string;
    message: string;
  } | null | undefined;
  totalPendingCount: number;
  onDismiss: (id: string) => void;
}

export default function EmployeeDirectPingModal({
  ping,
  totalPendingCount,
  onDismiss
}: EmployeeDirectPingModalProps) {
  if (!ping) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-red-950/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-slate-900 border-2 border-red-500 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 text-3xl font-extrabold mb-4 animate-ping">
          ⚠️
        </div>
        <h3 className="text-xl font-black text-red-400 tracking-tight mb-2">상사 긴급 경고</h3>
        <p className="text-sm text-slate-400 mb-2">
          <strong>{ping.fromName}</strong> 상사로부터 메시지가 전달되었습니다.
        </p>
        <p className="text-xs text-slate-500 mb-6">
          {totalPendingCount > 1 ? `${totalPendingCount}건 중 1건 표시` : '1건 표시'}
        </p>
        <div className="w-full bg-slate-950/80 border border-red-500/20 rounded-2xl p-5 mb-8 text-left text-sm text-slate-100 font-medium leading-relaxed shadow-inner">
          {ping.message}
        </div>
        <button
          onClick={() => onDismiss(ping.id)}
          className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-red-600/20 transition-all duration-300 cursor-pointer"
        >
          확인했습니다
        </button>
      </div>
    </div>
  );
}
