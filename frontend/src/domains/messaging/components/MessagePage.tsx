import React, { useEffect, useState } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { getRooms } from '../api';
import { MessageSidebar } from './MessageSidebar';
import { MessageRoom } from './MessageRoom';
import { useAuthStore } from '../../auth/stores/authStore';
import { useTeamStore } from '../../team/stores/teamStore';
import { useMessageWebSocket } from '../hooks/useMessageWebSocket';

export const MessagePage: React.FC = () => {
  const { user } = useAuthStore();
  const { fetchMyTeam, fetchTeamMembers, syncMemberContext } = useTeamStore();
  const { setRooms, setActiveRoomId } = useMessageStore();
  const [loading, setLoading] = useState(true);

  // 실시간 메시지/읽음/상태 변경 이벤트 수신을 위한 웹소켓 구독 활성화
  useMessageWebSocket();

  useEffect(() => {
    if (!user) return;

    // 팀 데이터 동기화 컨텍스트
    syncMemberContext(user.id);

    const initData = async () => {
      try {
        setLoading(true);

        // 1. 사용자 역할별 팀/멤버 데이터 동기화
        if (user.role === 'EMPLOYEE') {
          await fetchMyTeam();
        } else if (user.role === 'MANAGER') {
          await fetchTeamMembers(user.id);
        }

        // 2. 내 채팅방 목록 로드
        const chatRooms = await getRooms();
        setRooms(chatRooms);

        // 3. 첫 번째 채팅방이 존재하면 기본 활성화
        if (chatRooms.length > 0) {
          setActiveRoomId(chatRooms[0].roomId);
        } else {
          setActiveRoomId(null);
        }
      } catch (err) {
        console.error('채팅 페이지 초기 데이터 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [user, fetchMyTeam, fetchTeamMembers, syncMemberContext, setRooms, setActiveRoomId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">메시지 채널 정보를 로드 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-[calc(100vh-6rem)] overflow-hidden bg-slate-950">
      <MessageSidebar />
      <MessageRoom />
    </div>
  );
};
