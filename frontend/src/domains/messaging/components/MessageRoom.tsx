import React, { useEffect, useRef, useState } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { useAuthStore } from '../../auth/stores/authStore';
import { MessageHeader } from './MessageHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { StatusAlertBanner } from './StatusAlertBanner';
import { enterDirectRoom, enterTeamRoom, getStatusBanner, markDirectAsRead, markTeamAsRead } from '../api';

export const MessageRoom: React.FC = () => {
  const {
    activeRoomId,
    activeRoom,
    rooms,
    setActiveRoom,
    setBannerInfo,
    markMessagesAsRead,
  } = useMessageStore();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const loadedForRoomId = useRef<number | null>(null);

  useEffect(() => {
    if (!activeRoomId) {
      setActiveRoom(null);
      setBannerInfo(null);
      setError(false);
      loadedForRoomId.current = null;
      return;
    }

    const currentRoom = rooms.find((r) => Number(r.roomId) === Number(activeRoomId));
    if (!currentRoom) return;

    if (loadedForRoomId.current === activeRoomId && activeRoom) return;

    const loadRoomDetail = async () => {
      try {
        setLoading(true);
        setError(false);

        const roomType = currentRoom.roomType;

        if (roomType === 'DIRECT') {
          const otherMemberId = currentRoom.otherMemberId!;
          const detail = await enterDirectRoom(otherMemberId);
          setActiveRoom(detail);

          const banner = await getStatusBanner(otherMemberId);
          setBannerInfo(banner);

          await markDirectAsRead(activeRoomId);
        } else if (roomType === 'TEAM') {
          const detail = await enterTeamRoom(activeRoomId);
          setActiveRoom(detail);
          setBannerInfo(null);

          await markTeamAsRead(activeRoomId);
        }

        loadedForRoomId.current = activeRoomId;

        if (user?.id) {
          markMessagesAsRead(activeRoomId, user.id);
        }
      } catch (err) {
        console.error('채팅방 상세 정보를 가져오는 데 실패했습니다:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadRoomDetail();
  }, [activeRoomId, rooms, activeRoom, setActiveRoom, setBannerInfo, markMessagesAsRead, user]);

  if (!activeRoomId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500 gap-2">
        <span className="text-3xl">✉️</span>
        <span className="text-sm">대화할 채널이나 팀원을 선택해 주세요.</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500 gap-3">
        <span className="text-2xl">⚠️</span>
        <p className="text-sm">채팅방을 불러오는 데 실패했습니다.</p>
        <button
          onClick={() => {
            setError(false);
            loadedForRoomId.current = null;
            setActiveRoom(null);
          }}
          className="text-xs text-indigo-400 hover:text-indigo-300 underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs">채팅방 대화 내역을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!activeRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-600">잠시만 기다려 주세요...</p>
        </div>
      </div>
    );
  }

  const isTeam = !!(activeRoom.roomName || activeRoom.participants);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-950">
      <MessageHeader room={activeRoom} />
      {!isTeam && <StatusAlertBanner />}
      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden w-full">
        <MessageList />
      </div>
      <MessageInput roomId={activeRoomId} />
    </div>
  );
};

