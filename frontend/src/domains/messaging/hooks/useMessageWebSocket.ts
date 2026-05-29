import { useEffect } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { webSocketService } from '../../../lib/websocket';
import { useAuthStore } from '../../auth/stores/authStore';
import { useTeamStore } from '../../team/stores/teamStore';
import { parseWsEnvelope } from '../../../lib/wsEvent';
import type { ChatMessageResponse, UserStatus } from '../types';

export const useMessageWebSocket = () => {
  const { addMessage, markMessagesAsRead, updateMemberStatus, addTeamChatMember } = useMessageStore();
  const { user } = useAuthStore();
  const { teams, memberTeamMap } = useTeamStore();

  const myId = user?.id;
  const managerId = (() => {
    if (!user) return undefined;
    if (user.role === 'MANAGER') {
      return user.id;
    }
    const teamId = memberTeamMap[user.id];
    if (!teamId) return undefined;
    const team = teams.find((t) => t.id === teamId);
    return team?.managerId;
  })();

  useEffect(() => {
    if (!myId) return;

    // 1. 웹소켓 연결 요청 보장 (이미 연결되어 있다면 무시됨)
    webSocketService.connect();

    const memberTopic = `/topic/members/${myId}`;
    const teamTopic = managerId ? `/topic/team/${managerId}` : '';

    // 2. 개인 토픽 구독 등록 (연결 완료 시 자동으로 실제 구독이 수행됨)
    webSocketService.subscribe(memberTopic, (msg) => {
      const envelope = parseWsEnvelope(msg);
      if (!envelope) return;
 
      switch (envelope.event) {
        case 'CHAT_MESSAGE_RECEIVED':
        case 'CHAT_URGENT_RECEIVED': {
          const messagePayload = envelope.data as any;
          const state = useMessageStore.getState();
          const targetRoom = state.rooms.find((r) => Number(r.roomId) === Number(messagePayload.roomId));
          const inferredRoomType = targetRoom ? targetRoom.roomType : 'DIRECT';

          const message: ChatMessageResponse = {
            messageId: messagePayload.messageId,
            roomId: messagePayload.roomId,
            roomType: inferredRoomType,
            senderId: messagePayload.senderId,
            senderUsername: messagePayload.senderUsername,
            content: messagePayload.content,
            messageType: messagePayload.messageType,
            read: false,
            createdAt: messagePayload.createdAt,
            readAt: null,
          };
          addMessage(message);
          break;
        }
        case 'CHAT_READ': {
          const readPayload = envelope.data as any;
          markMessagesAsRead(readPayload.roomId, readPayload.readByMemberId);
          break;
        }
        case 'STATUS_CHANGED': {
          const statusPayload = envelope.data as any;
          updateMemberStatus(statusPayload.memberId, statusPayload.statusType as UserStatus);
          break;
        }
        default:
          break;
      }
    });

    // 3. 팀 토픽 구독 등록
    if (teamTopic) {
      webSocketService.subscribe(teamTopic, (msg) => {
        const envelope = parseWsEnvelope(msg);
        if (!envelope) return;

        switch (envelope.event) {
          case 'STATUS_CHANGED': {
            const teamStatusPayload = envelope.data as any;
            updateMemberStatus(teamStatusPayload.memberId, teamStatusPayload.statusType as UserStatus);
            break;
          }
          case 'TEAM_CHAT_MEMBER_JOINED': {
            const memberPayload = envelope.data as any;
            addTeamChatMember({
              memberId: memberPayload.memberId,
              username: memberPayload.username,
              status: memberPayload.status as UserStatus,
            });
            break;
          }
          default:
            break;
        }
      });
    }

    // 4. 컴포넌트 언마운트 또는 의존성 갱신 시 안전하게 구독 해제(cleanup)
    return () => {
      webSocketService.unsubscribe(memberTopic);
      if (teamTopic) {
        webSocketService.unsubscribe(teamTopic);
      }
    };
  }, [myId, managerId, addMessage, markMessagesAsRead, updateMemberStatus, addTeamChatMember]);
};
