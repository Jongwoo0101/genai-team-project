import React, { useState } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { useAuthStore } from '../../auth/stores/authStore';
import { useTeamStore } from '../../team/stores/teamStore';
import { enterDirectRoom, getRooms } from '../api';
import { Circle, Plus } from 'lucide-react';
import type { UserStatus } from '../types';

export const MessageSidebar: React.FC = () => {
  const { user } = useAuthStore();
  const { teams, memberTeamMap } = useTeamStore();
  const {
    rooms,
    activeRoomId,
    setActiveRoomId,
    setActiveRoom,
    setRooms,
  } = useMessageStore();

  const [loadingMemberId, setLoadingMemberId] = useState<number | null>(null);

  // 1. 내가 속한 팀 정보 조회
  const myTeam = (() => {
    if (!user) return undefined;
    if (user.role === 'MANAGER') {
      return teams.find((t) => t.managerId === user.id);
    }
    const teamId = memberTeamMap[user.id];
    if (!teamId) return undefined;
    return teams.find((t) => t.id === teamId);
  })();

  // 2. 대화방 목록을 팀 채팅과 1:1 채팅으로 분리
  const teamRooms = rooms.filter((r) => r.roomType === 'TEAM');
  const directRooms = rooms.filter((r) => r.roomType === 'DIRECT');

  // 3. 대화 가능한 팀원 리스트 (나를 제외)
  const conversationMembers = (() => {
    if (!myTeam || !user) return [];
    const list: { id: number; username: string; role: 'MANAGER' | 'EMPLOYEE' }[] = [];

    // 내가 직원인 경우, 매니저(상사)를 대화 상대로 추가
    if (user.role === 'EMPLOYEE' && myTeam.managerId) {
      list.push({
        id: myTeam.managerId,
        username: myTeam.managerName || '상사',
        role: 'MANAGER',
      });
    }

    // 팀 멤버들 추가 (본인 제외)
    if (myTeam.members) {
      myTeam.members.forEach((m) => {
        if (m.id !== user.id) {
          list.push({
            id: m.id,
            username: m.username,
            role: 'EMPLOYEE',
          });
        }
      });
    }
    return list;
  })();

  // 4. 대화방이 이미 생성된 멤버와 그렇지 않은 멤버 구분 (1:1 대상만)
  const activeChatPartnerIds = new Set(directRooms.map((r) => Number(r.otherMemberId)));
  const newChatMembers = conversationMembers.filter((m) => !activeChatPartnerIds.has(Number(m.id)));

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'WORKING':
      case 'FOCUS':
        return 'text-emerald-400 fill-emerald-400';
      case 'MEETING':
        return 'text-amber-400 fill-amber-400';
      case 'AWAY':
        return 'text-cyan-400 fill-cyan-400';
      default:
        return 'text-slate-500 fill-slate-500';
    }
  };

  const getStatusText = (status: UserStatus) => {
    switch (status) {
      case 'WORKING':
        return '근무 중';
      case 'FOCUS':
        return '집중 근무';
      case 'MEETING':
        return '회의 중';
      case 'AWAY':
        return '자리비움';
      default:
        return '오프라인';
    }
  };

  // 팀원 클릭 시 1:1 대화방 개설 및 입장 처리
  const handleSelectMember = async (memberId: number) => {
    const existingRoom = directRooms.find((r) => Number(r.otherMemberId) === Number(memberId));
    if (existingRoom) {
      setActiveRoomId(existingRoom.roomId);
      return;
    }

    try {
      setLoadingMemberId(memberId);
      const detail = await enterDirectRoom(memberId);
      setActiveRoom(detail);
      setActiveRoomId(detail.roomId);

      // 대화방 목록 최신화
      const chatRooms = await getRooms();
      setRooms(chatRooms);
    } catch (err) {
      console.error('1:1 대화방 생성 실패:', err);
      alert('대화방 생성에 실패했습니다.');
    } finally {
      setLoadingMemberId(null);
    }
  };

  return (
    <aside className="w-80 border-r border-slate-850 bg-slate-950 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-slate-850">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span>💬</span> 메시지 채널
        </h2>
        {myTeam && (
          <p className="text-[10px] text-indigo-400 font-semibold mt-1 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 inline-block">
            {myTeam.name}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* 팀 전체 채팅 섹션 */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">팀 전체 채팅</span>
          </div>
          <div className="space-y-1">
            {teamRooms.map((room) => {
              const hasUnread = room.unreadCount > 0;

              return (
                <button
                  key={room.roomId}
                  onClick={() => setActiveRoomId(room.roomId)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition ${
                    Number(activeRoomId) === Number(room.roomId)
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0 relative">
                      <span>👥</span>
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="truncate text-xs font-semibold">
                        {room.roomName || '팀 전체 채팅'}
                      </p>
                      {room.lastMessage && (
                        <p className={`text-[10px] truncate ${
                          activeRoomId === room.roomId ? 'text-indigo-200' : 'text-slate-500'
                        }`}>
                          {room.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 pl-2">
                    <span className={`text-[9px] ${
                      activeRoomId === room.roomId ? 'text-indigo-200' : 'text-slate-500'
                    }`}>
                      참여자 {room.participantCount}명
                    </span>
                  </div>
                </button>
              );
            })}
            {teamRooms.length === 0 && (
              <div className="text-xs text-slate-600 px-3 py-2">참여 중인 팀 채팅방이 없습니다.</div>
            )}
          </div>
        </div>

        {/* 진행 중인 대화 섹션 (1:1) */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">진행 중인 대화</span>
          </div>
          <div className="space-y-1">
            {directRooms.map((room) => {
              const currentStatus = room.otherMemberStatus;
              const hasUnread = room.unreadCount > 0;

              return (
                <button
                  key={room.roomId}
                  onClick={() => setActiveRoomId(room.roomId)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition ${
                    Number(activeRoomId) === Number(room.roomId)
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0 relative">
                      {room.otherMemberUsername?.[0] || 'U'}
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="truncate text-xs font-semibold">
                        {room.otherMemberUsername || '알 수 없는 사용자'}
                      </p>
                      {room.lastMessage && (
                        <p className={`text-[10px] truncate ${
                          activeRoomId === room.roomId ? 'text-indigo-200' : 'text-slate-500'
                        }`}>
                          {room.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 pl-2">
                    {currentStatus && (
                      <>
                        <Circle className={`w-1.5 h-1.5 ${getStatusColor(currentStatus)}`} />
                        <span className={`text-[9px] ${
                          activeRoomId === room.roomId ? 'text-indigo-200' : 'text-slate-500'
                        }`}>
                          {getStatusText(currentStatus)}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
            {directRooms.length === 0 && (
              <div className="text-xs text-slate-600 px-3 py-2">시작된 1:1 대화가 없습니다.</div>
            )}
          </div>
        </div>

        {/* 새로운 대화 가능한 팀원들 */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">새 대화 시작</span>
          </div>
          <div className="space-y-1">
            {newChatMembers.map((member) => (
              <button
                key={member.id}
                disabled={loadingMemberId === member.id}
                onClick={() => handleSelectMember(member.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition disabled:opacity-50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 text-[10px] font-bold shrink-0">
                    {member.username?.[0] || 'U'}
                  </div>
                  <span className="truncate">{member.username}</span>
                  {member.role === 'MANAGER' && (
                    <span className="text-[8px] bg-red-500/10 text-red-400 px-1 rounded border border-red-500/10">
                      상사
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-indigo-400 flex items-center gap-0.5 hover:text-indigo-300 font-bold shrink-0">
                  {loadingMemberId === member.id ? '개설 중...' : <><Plus className="w-3 h-3" /> 대화</>}
                </span>
              </button>
            ))}
            {newChatMembers.length === 0 && (
              <div className="text-[10px] text-slate-600 px-3 py-2">새로 대화할 수 있는 팀원이 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

