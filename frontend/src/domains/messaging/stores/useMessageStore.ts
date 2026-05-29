import { create } from 'zustand';
import type {
  ChatRoomResponse,
  ChatRoomDetailResponse,
  ChatMessageResponse,
  UserStatus,
  ReceiverStatusBannerResponse,
  TeamParticipant,
} from '../types';

interface MessageState {
  rooms: ChatRoomResponse[];
  activeRoomId: number | null;
  activeRoom: ChatRoomDetailResponse | null;
  bannerInfo: ReceiverStatusBannerResponse | null;

  setRooms: (rooms: ChatRoomResponse[]) => void;
  setActiveRoomId: (roomId: number | null) => void;
  setActiveRoom: (room: ChatRoomDetailResponse | null) => void;
  setBannerInfo: (banner: ReceiverStatusBannerResponse | null) => void;
  addMessage: (message: ChatMessageResponse) => void;
  markMessagesAsRead: (roomId: number, readByMemberId: number) => void;
  updateMemberStatus: (memberId: number, status: UserStatus) => void;
  addTeamChatMember: (member: TeamParticipant) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  rooms: [],
  activeRoomId: null,
  activeRoom: null,
  bannerInfo: null,

  setRooms: (rooms) =>
    set((state) => ({
      rooms: rooms.map((r) =>
        Number(r.roomId) === Number(state.activeRoomId) ? { ...r, unreadCount: 0 } : r
      ),
    })),
  setActiveRoomId: (activeRoomId) =>
    set((state) => {
      const updatedRooms = state.rooms.map((r) =>
        Number(r.roomId) === Number(activeRoomId) ? { ...r, unreadCount: 0 } : r
      );
      return {
        activeRoomId,
        rooms: updatedRooms,
        activeRoom: null,
        bannerInfo: null,
      };
    }),
  setActiveRoom: (activeRoom) => set({ activeRoom }),
  setBannerInfo: (bannerInfo) => set({ bannerInfo }),

  addMessage: (message) =>
    set((state) => {
      const isCurrentActiveRoom = Number(state.activeRoomId) === Number(message.roomId);

      let updatedActiveRoom = state.activeRoom;
      if (isCurrentActiveRoom && state.activeRoom) {
        const exists = state.activeRoom.messages.some(
          (m) => Number(m.messageId) === Number(message.messageId)
        );
        if (!exists) {
          updatedActiveRoom = {
            ...state.activeRoom,
            messages: [...state.activeRoom.messages, message],
          };
        }
      }

      const updatedRooms = state.rooms.map((r) => {
        if (Number(r.roomId) === Number(message.roomId)) {
          return {
            ...r,
            lastMessage: message,
            unreadCount: isCurrentActiveRoom ? 0 : r.unreadCount + 1,
          };
        }
        return r;
      });

      return {
        activeRoom: updatedActiveRoom,
        rooms: updatedRooms,
      };
    }),

  markMessagesAsRead: (roomId, readByMemberId) =>
    set((state) => {
      let updatedActiveRoom = state.activeRoom;
      if (state.activeRoom && Number(state.activeRoom.roomId) === Number(roomId)) {
        const updatedMessages = state.activeRoom.messages.map((m) => {
          if (Number(m.senderId) !== Number(readByMemberId) && !m.read) {
            return { ...m, read: true, readAt: new Date().toISOString() };
          }
          return m;
        });
        updatedActiveRoom = {
          ...state.activeRoom,
          messages: updatedMessages,
        };
      }

      const updatedRooms = state.rooms.map((r) => {
        if (Number(r.roomId) === Number(roomId)) {
          const updatedLastMsg =
            r.lastMessage && Number(r.lastMessage.senderId) !== Number(readByMemberId)
              ? { ...r.lastMessage, read: true }
              : r.lastMessage;

          return {
            ...r,
            lastMessage: updatedLastMsg,
            unreadCount: 0,
          };
        }
        return r;
      });

      return {
        activeRoom: updatedActiveRoom,
        rooms: updatedRooms,
      };
    }),

  updateMemberStatus: (memberId, status) =>
    set((state) => {
      const updatedRooms = state.rooms.map((r) =>
        Number(r.otherMemberId) === Number(memberId) ? { ...r, otherMemberStatus: status } : r
      );

      let updatedActiveRoom = state.activeRoom;
      if (state.activeRoom) {
        const isDirectPartner = Number(state.activeRoom.otherMemberId) === Number(memberId);
        const hasParticipants = !!state.activeRoom.participants;

        if (isDirectPartner || hasParticipants) {
          updatedActiveRoom = {
            ...state.activeRoom,
            otherMemberStatus: isDirectPartner ? status : state.activeRoom.otherMemberStatus,
            participants: state.activeRoom.participants
              ? state.activeRoom.participants.map((p) =>
                  Number(p.memberId) === Number(memberId) ? { ...p, status } : p
                )
              : undefined,
          };
        }
      }

      let updatedBannerInfo = state.bannerInfo;
      if (state.bannerInfo && Number(state.bannerInfo.otherMemberId) === Number(memberId)) {
        const showBanner = status === 'MEETING' || status === 'AWAY';
        const statusLabel = status === 'MEETING' ? '회의 중' : '휴식/자리비움 상태';
        updatedBannerInfo = {
          ...state.bannerInfo,
          otherMemberStatus: status,
          showBanner,
          bannerMessage: showBanner
            ? `현재 ${state.bannerInfo.otherMemberUsername}님은 ${statusLabel}입니다. 알림이 울리지 않습니다.`
            : null,
        };
      }

      return {
        rooms: updatedRooms,
        activeRoom: updatedActiveRoom,
        bannerInfo: updatedBannerInfo,
      };
    }),

  addTeamChatMember: (member) =>
    set((state) => {
      if (!state.activeRoom) return {};
      const participants = state.activeRoom.participants || [];
      const exists = participants.some((p) => Number(p.memberId) === Number(member.memberId));
      if (exists) return {};
      return {
        activeRoom: {
          ...state.activeRoom,
          participants: [...participants, member],
        },
      };
    }),
}));

