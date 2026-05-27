import { Plus, Video } from 'lucide-react';
import type { AuthUser } from '../../lib/types';
import MeetingRoomModalHost from './MeetingRoomModalHost';
import { useMeetingRoomController } from './useMeetingRoomController';

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
    </>
  );
}
