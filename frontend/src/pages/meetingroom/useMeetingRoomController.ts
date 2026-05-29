import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useVideoCallStore } from '../../domains/video-call/stores/videoCallStore';
import { useTeamStore } from '../../domains/team/stores/teamStore';
import { webSocketService } from '../../lib/websocket';
import { WEBSOCKET_TOPICS } from '../../lib/constants';
import { parseWsEnvelope } from '../../lib/wsEvent';
import type { AuthUser } from '../../lib/types';
import { useCommuteStore } from '../../domains/commute/stores/commuteStore';

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
    handleWebsocketEvent,
  } = useVideoCallStore();

  const [roomTitle, setRoomTitle] = useState('');
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const processedRequestsRef = useRef<Set<number>>(new Set());

  const { teams, memberTeamMap, syncMemberContext: syncTeamContext, fetchMyTeam, fetchTeamMembers } = useTeamStore();

  const team = (() => {
    if (!user) return undefined;
    if (user.role === 'MANAGER') {
      return teams.find((t) => t.managerId === user.id);
    }
    const teamId = memberTeamMap[user.id];
    if (!teamId) return undefined;
    return teams.find((t) => t.id === teamId);
  })();

  const managerId = user?.role === 'MANAGER' ? user.id : team?.managerId;

  useEffect(() => {
    if (user) {
      syncTeamContext(user.id);
      if (user.role === 'EMPLOYEE') {
        void fetchMyTeam();
      } else if (user.role === 'MANAGER') {
        void fetchTeamMembers(user.id);
      }
    }
  }, [user, syncTeamContext, fetchMyTeam, fetchTeamMembers]);

  useEffect(() => {
    if (!user || !team?.id) return;

    webSocketService.connect((connected) => {
      if (connected) {
        // 1. 팀 토픽 구독
        const teamTopic = WEBSOCKET_TOPICS.TEAM(team.id);
        webSocketService.subscribe(teamTopic, (msg) => {
          const envelope = parseWsEnvelope(msg);
          if (!envelope) return;
          void handleWebsocketEvent(envelope);
        });

        // 2. 개인 토픽 구독
        const memberTopic = WEBSOCKET_TOPICS.MEMBER(user.id);
        webSocketService.subscribe(memberTopic, (msg) => {
          const envelope = parseWsEnvelope(msg);
          if (!envelope) return;
          
          if (
            envelope.event === 'INVITED' ||
            envelope.event === 'JOIN_REQUESTED' ||
            envelope.event === 'REQUEST_ACCEPTED' ||
            envelope.event === 'REQUEST_REJECTED'
          ) {
            void handleWebsocketEvent(envelope);
          }

          // 추가: 긴급 메시지(CHAT_URGENT_RECEIVED) 수신 처리
          if (envelope.event === 'CHAT_URGENT_RECEIVED') {
            const data = envelope.data as any;
            const commuteStore = useCommuteStore.getState();
            commuteStore.addDirectPingFromNotification({
              notificationId: data.messageId || Date.now(),
              senderId: data.senderId,
              senderUsername: data.senderUsername,
              receiverId: user.id,
              receiverUsername: user.username,
              message: data.content,
              notificationType: 'IMPORTANT',
              read: false,
              createdAt: data.createdAt || new Date().toISOString(),
              readAt: null
            });
          }

          // 일반 상사 경고 알림 수신 처리
          if (envelope.event === 'NOTIFICATION_RECEIVED') {
            const data = envelope.data as any;
            if (data && data.notificationType === 'IMPORTANT') {
              useCommuteStore.getState().addDirectPingFromNotification(data);
            }
          }
        });
      }
    });

    return () => {
      if (team?.id) {
        webSocketService.unsubscribe(WEBSOCKET_TOPICS.TEAM(team.id));
      }
      webSocketService.unsubscribe(WEBSOCKET_TOPICS.MEMBER(user.id));
      webSocketService.disconnect();
    };
  }, [user, team?.id, handleWebsocketEvent]);

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
