import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useVideoCallStore } from '../../domains/video-call/stores/videoCallStore';
import type { AuthUser } from '../../lib/types';

interface UseMeetingRoomControllerOptions {
  user: AuthUser | null;
  commuteStatus?: 'NONE' | 'WORK' | 'LEAVE';
  requireWorkStatus?: boolean;
}

const getErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;

export function useMeetingRoomController({
  user,
  commuteStatus,
  requireWorkStatus = false,
}: UseMeetingRoomControllerOptions) {
  const {
    rooms,
    activeRoom,
    createRoom,
    joinRoom,
    invitations,
    acceptInvitation,
    declineInvitation,
    joinRequests,
    enterRoom,
    loadRooms,
    syncMemberContext,
  } = useVideoCallStore();

  const [roomTitle, setRoomTitle] = useState('');
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const processedRequestsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (user) {
      syncMemberContext(user.id);
      void loadRooms();
    }
  }, [user, loadRooms, syncMemberContext]);

  useEffect(() => {
    if (user && !activeRoom) {
      const approvedRequest = joinRequests.find(
        (r) => r.userId === user.id && r.status === 'approved' && !processedRequestsRef.current.has(r.requestId)
      );
      if (approvedRequest) {
        processedRequestsRef.current.add(approvedRequest.requestId);
        joinRoom(approvedRequest.roomId);
        setIsVideoModalOpen(true);
      }
    }
  }, [joinRequests, activeRoom, user, joinRoom]);

  const ensureCanUseMeetingRoom = () => {
    if (!requireWorkStatus) return true;
    if (commuteStatus === 'WORK') return true;
    alert('업무 시작(출근)을 먼저 완료해 주세요.');
    return false;
  };

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!ensureCanUseMeetingRoom()) return;
    if (!roomTitle.trim()) {
      alert('방 제목을 입력해 주세요.');
      return;
    }
    if (!user) return;

    try {
      await createRoom(roomTitle);
      setRoomTitle('');
      setIsCreateRoomOpen(false);
      setIsVideoModalOpen(true);
    } catch (err: unknown) {
      alert(getErrorMessage(err, '회의실 개설에 실패했습니다.'));
    }
  };

  const handleJoinRoom = async (roomId: number) => {
    if (!ensureCanUseMeetingRoom()) return;
    if (!user) return;

    try {
      const result = await enterRoom(roomId, user.id);
      if (result === 'joined') {
        setIsVideoModalOpen(true);
      } else if (result === 'pending') {
        alert('이미 참가 대기 요청을 보냈습니다. 호스트의 승인을 기다려 주세요.');
      } else {
        alert('참가 대기 요청을 보냈습니다. 호스트가 승인하면 입장됩니다.');
      }
    } catch (err: unknown) {
      alert(getErrorMessage(err, '회의실 참가 처리에 실패했습니다.'));
    }
  };

  const openJoinedRoom = async (roomId: number) => {
    await joinRoom(roomId);
    setIsVideoModalOpen(true);
  };

  const handleAcceptInvitation = async (roomId: number, inviteId: number) => {
    await acceptInvitation(roomId, inviteId);
    setIsVideoModalOpen(true);
  };

  return {
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
    openJoinedRoom,
    handleAcceptInvitation,
    declineInvitation,
  };
}
