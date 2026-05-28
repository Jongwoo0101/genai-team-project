import React, { useEffect, useRef, useState } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { useAuthStore } from '../../auth/stores/authStore';
import { MessageHeader } from './MessageHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { StatusAlertBanner } from './StatusAlertBanner';
import { enterRoom, getStatusBanner, markAsRead } from '../api';

export const MessageRoom: React.FC = () => {
  const {
    activeRoomId,
    activeRoom,
    rooms,           // ← store에서 직접 구독 (getState() 대신)
    setActiveRoom,
    setBannerInfo,
    markMessagesAsRead,
  } = useMessageStore();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // rooms 변경(새 메시지 도착 등)으로 인한 중복 재로드 방지
  const loadedForRoomId = useRef<number | null>(null);

  useEffect(() => {
    if (!activeRoomId) {
      setActiveRoom(null);
      setBannerInfo(null);
      setError(false);
      loadedForRoomId.current = null;
      return;
    }

    // rooms가 아직 로드되지 않았으면 대기
    // (rooms가 setRooms로 업데이트되면 effect 재실행됨)
    const currentRoom = rooms.find((r) => Number(r.roomId) === Number(activeRoomId));
    if (!currentRoom) return;

    // 이미 이 방의 상세를 로드했고 activeRoom이 있다면 재로드 불필요
    // (새 메시지가 와서 rooms가 바뀌어도 재로드 방지)
    if (loadedForRoomId.current === activeRoomId && activeRoom) return;

    const loadRoomDetail = async () => {
      try {
        setLoading(true);
        setError(false);

        const otherMemberId = currentRoom.otherMemberId;

        // 방 입장 (메시지 히스토리 및 상대 정보 조회)
        const detail = await enterRoom(otherMemberId);
        setActiveRoom(detail);
        loadedForRoomId.current = activeRoomId;

        // 상태 표시 배너 로드
        const banner = await getStatusBanner(otherMemberId);
        setBannerInfo(banner);

        // 읽음 처리 (API)
        await markAsRead(activeRoomId);
        
        // 로컬 상태 즉시 갱신 (낙관적 업데이트)
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

  // ── 렌더 분기 ──────────────────────────────────────────────────

  if (!activeRoomId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500 gap-2">
        <span className="text-3xl">✉️</span>
        <span className="text-sm">대화할 채널이나 팀원을 선택해 주세요.</span>
      </div>
    );
  }

  // API 실패 상태
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

  // 로딩 중 (API 호출 진행 중)
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

  // rooms 로드 대기 중 (activeRoomId는 있지만 아직 rooms가 없는 순간)
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
