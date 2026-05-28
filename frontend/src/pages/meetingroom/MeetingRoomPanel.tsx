import { useEffect, useRef } from 'react';
import { Plus, Video } from 'lucide-react';
import type { AuthUser } from '../../lib/types';
import MeetingRoomModalHost from './MeetingRoomModalHost';
import { useMeetingRoomController } from './useMeetingRoomController';
import { useCommuteStore } from '../../domains/commute/stores/commuteStore';

interface MeetingRoomPanelProps {
  user: AuthUser | null;
  commuteStatus?: 'NONE' | 'WORK' | 'LEAVE';
  requireWorkStatus?: boolean;
}

export default function MeetingRoomPanel({
  user,
  commuteStatus,
  requireWorkStatus = false,
}: MeetingRoomPanelProps) {
  const {
    directPings,
    dismissDirectPing
  } = useCommuteStore();

  const playedPingsRef = useRef<Set<string>>(new Set());
  const alarmAudioContextRef = useRef<AudioContext | null>(null);

  // 경보음 합성 재생 함수
  const playAlarm = () => {
    try {
      const WebAudioContext =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!WebAudioContext) return;

      if (!alarmAudioContextRef.current || alarmAudioContextRef.current.state === 'closed') {
        alarmAudioContextRef.current = new WebAudioContext();
      }
      const ctx = alarmAudioContextRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const now = ctx.currentTime;
      
      const playBeep = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration - 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
      };

      playBeep(now, 880, 0.25);
      playBeep(now + 0.3, 880, 0.25);
      playBeep(now + 0.6, 1200, 0.4);
    } catch (e) {
      console.error('알람 소리 재생 실패:', e);
    }
  };

  // 상사 경보(DirectPing) 수신 시 알람음 재생
  useEffect(() => {
    if (user) {
      const pendingPings = directPings.filter(
        (p) => p.employeeId === user.id && p.status === 'pending'
      );
      
      let shouldPlay = false;
      pendingPings.forEach((p) => {
        if (!playedPingsRef.current.has(p.id)) {
          playedPingsRef.current.add(p.id);
          shouldPlay = true;
        }
      });

      if (shouldPlay) {
        playAlarm();
      }
    }
  }, [directPings, user]);

  useEffect(() => {
    if (!user) return;
    const activePingIds = new Set(
      directPings.filter((p) => p.employeeId === user.id).map((p) => p.id)
    );
    playedPingsRef.current.forEach((id) => {
      if (!activePingIds.has(id)) {
        playedPingsRef.current.delete(id);
      }
    });
  }, [directPings, user]);

  useEffect(() => {
    return () => {
      if (alarmAudioContextRef.current && alarmAudioContextRef.current.state !== 'closed') {
        void alarmAudioContextRef.current.close();
      }
      alarmAudioContextRef.current = null;
    };
  }, []);
  const {
    rooms,
    activeRoom,
    invitations,
    roomTitle,
    setRoomTitle,
    isCreateRoomOpen,
    setIsCreateRoomOpen,
    isVideoModalOpen,
    setIsVideoModalOpen,
    handleCreateRoom,
    handleJoinRoom,
    handleAcceptInvitation,
    declineInvitation,
  } = useMeetingRoomController({ user, commuteStatus, requireWorkStatus });

  return (
    <>
      <div className="rounded-2xl bg-slate-900 border border-white/5 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-300 font-semibold flex items-center gap-2 text-sm">
            <Video className="w-4 h-4 text-cyan-400" /> 실시간 가상 영상통화 회의실
          </span>
          <button
            onClick={() => {
              if (requireWorkStatus && commuteStatus !== 'WORK') {
                alert('업무 시작(출근)을 완료해 주세요.');
                return;
              }
              setIsCreateRoomOpen(!isCreateRoomOpen);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> 방 개설하기
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-6">팀원들과 실시간 화상 대화가 필요할 때 방을 만들거나 다른 팀원의 회의에 참여하세요.</p>

        {isCreateRoomOpen && (
          <form onSubmit={handleCreateRoom} className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="개설할 회의실 제목을 입력해 주세요"
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCreateRoomOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs cursor-pointer"
              >
                개설 완료
              </button>
            </div>
          </form>
        )}

        {rooms.length === 0 ? (
          <div className="py-12 border border-dashed border-slate-800 rounded-xl text-center">
            <Video className="w-8 h-8 text-slate-700 mx-auto mb-2.5 opacity-50" />
            <p className="text-xs text-slate-600">현재 개설된 영상통화 회의실이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rooms.map((room) => (
              <div
                key={room.roomId}
                className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex flex-col justify-between gap-4 group hover:border-cyan-500/30 transition-all duration-300"
              >
                <div>
                  <h4 className="text-sm font-bold text-white truncate">{room.title}</h4>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">개설자: {room.hostName}</span>
                  <span className="inline-flex items-center gap-1 mt-2 text-[10px] text-cyan-400 font-semibold bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">
                    참여자 {room.participants.length}명
                  </span>
                </div>
                <button
                  onClick={() => handleJoinRoom(room.roomId)}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 font-semibold text-xs transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>회의 입장하기</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <MeetingRoomModalHost
        activeRoom={activeRoom}
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
      />

      {invitations
        .filter((i) => i.inviteeId === user?.id && i.status === 'pending')
        .map((inv) => (
          <div
            key={inv.inviteId}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl w-80 backdrop-blur-md animate-bounce"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Video className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">회의 초대 도착</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  <strong>{inv.hostName}</strong>님이 <strong>{inv.roomTitle}</strong> 회의에 초대하셨습니다.
                </p>
                <div className="flex gap-2 mt-4 justify-end">
                  <button
                    onClick={() => declineInvitation(inv.roomId, inv.inviteId)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition duration-200 cursor-pointer"
                  >
                    거절
                  </button>
                  <button
                    onClick={() => handleAcceptInvitation(inv.roomId, inv.inviteId)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition duration-200 cursor-pointer"
                  >
                    수락 및 입장
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

      {/* 상사 직접 경보(DirectPing) 모달 */}
      {(() => {
        const pendingPings = directPings.filter(
          (p) => p.employeeId === user?.id && p.status === 'pending'
        );
        const ping = pendingPings[0];
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
                {pendingPings.length > 1 ? `${pendingPings.length}건 중 1건 표시` : '1건 표시'}
              </p>
              <div className="w-full bg-slate-950/80 border border-red-500/20 rounded-2xl p-5 mb-8 text-left text-sm text-slate-100 font-medium leading-relaxed shadow-inner">
                {ping.message}
              </div>
              <button
                onClick={() => dismissDirectPing(ping.id)}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-red-600/20 transition-all duration-300 cursor-pointer"
              >
                확인했습니다
              </button>
            </div>
          </div>
        );
      })()}
    </>
  );
}
