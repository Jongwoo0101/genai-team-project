import React, { useEffect, useState } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { MessageHeader } from './MessageHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { StatusAlertBanner } from './StatusAlertBanner';
import { enterRoom, getStatusBanner, markAsRead } from '../api';

export const MessageRoom: React.FC = () => {
  const {
    activeRoomId,
    activeRoom,
    setActiveRoom,
    setBannerInfo,
  } = useMessageStore();

  const [loading, setLoading] = useState(false);

  // activeRoomId 가 활성화되거나 변경될 때 방 상세 내용 및 상대 상태 배너 로드
  useEffect(() => {
    if (!activeRoomId) {
      setActiveRoom(null);
      setBannerInfo(null);
      return;
    }

    const loadRoomDetail = async () => {
      try {
        setLoading(true);
        
        // 1. 대화방 목록 중 해당 방의 상대방 ID 식별
        // activeRoom 스토어에 들어있는 상대방 ID를 기준으로 활용하거나,
        // rooms 목록에서 activeRoomId에 해당하는 방을 검색
        const currentRoom = useMessageStore.getState().rooms.find((r) => Number(r.roomId) === Number(activeRoomId));
        if (!currentRoom) return;

        const otherMemberId = currentRoom.otherMemberId;

        // 2. 방 입장 (메시지 히스토리 및 상대 정보 자동 생성/조회)
        const detail = await enterRoom(otherMemberId);
        setActiveRoom(detail);

        // 3. 상태 표시 배너 로드
        const banner = await getStatusBanner(otherMemberId);
        setBannerInfo(banner);

        // 4. 읽음 처리 API 호출
        await markAsRead(activeRoomId);
      } catch (err) {
        console.error('채팅방 상세 정보를 가져오는 데 실패했습니다:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRoomDetail();
  }, [activeRoomId, setActiveRoom, setBannerInfo]);

  if (!activeRoomId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500 gap-2">
        <span className="text-3xl">✉️</span>
        <span className="text-sm">대화할 채널이나 팀원을 선택해 주세요.</span>
      </div>
    );
  }

  if (loading || !activeRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs">채팅방 대화 내역을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-950">
      <MessageHeader room={activeRoom} />
      <StatusAlertBanner />
      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden w-full">
        <MessageList />
      </div>
      <MessageInput roomId={activeRoomId} />
    </div>
  );
};
