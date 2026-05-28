import { create } from 'zustand';
import type {
  ChatRoomResponse,
  ChatRoomDetailResponse,
  ChatMessageResponse,
  UserStatus,
  ReceiverStatusBannerResponse,
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
}

export const useMessageStore = create<MessageState>((set) => ({
  rooms: [],
  activeRoomId: null,
  activeRoom: null,
  bannerInfo: null,

  setRooms: (rooms) => set({ rooms }),
  setActiveRoomId: (activeRoomId) =>
    set((state) => {
      // 액티브 룸 ID 변경 시, 해당 방의 unreadCount를 0으로 리셋해줌
      const updatedRooms = state.rooms.map((r) =>
        Number(r.roomId) === Number(activeRoomId) ? { ...r, unreadCount: 0 } : r
      );
      return {
        activeRoomId,
        rooms: updatedRooms,
        // 활성화된 방이 변경되면 즉시 상세 데이터 및 배너는 null로 비움 (이전 방 데이터 꼬임 방지)
        activeRoom: null,
        bannerInfo: null,
      };
    }),
  setActiveRoom: (activeRoom) => set({ activeRoom }),
  setBannerInfo: (bannerInfo) => set({ bannerInfo }),

  addMessage: (message) =>
    set((state) => {
      const isCurrentActiveRoom = Number(state.activeRoomId) === Number(message.roomId);

      // 1. 활성화된 방의 메시지 목록 업데이트
      let updatedActiveRoom = state.activeRoom;
      if (isCurrentActiveRoom && state.activeRoom) {
        // 중복 방지
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

      // 2. 방 목록(rooms)의 lastMessage 및 unreadCount 갱신
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
      // 1. 활성화된 방에서 내 메시지(상대방이 읽은 메시지)들을 read: true 처리
      let updatedActiveRoom = state.activeRoom;
      if (state.activeRoom && Number(state.activeRoom.roomId) === Number(roomId)) {
        const updatedMessages = state.activeRoom.messages.map((m) => {
          // 내가 보낸 메시지인데 상대방(readByMemberId)이 읽었다면 read 마크
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

      // 2. 방 목록에서 읽음 처리 업데이트
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
      // 1. 방 목록에서 해당 멤버의 상태 갱신
      const updatedRooms = state.rooms.map((r) =>
        Number(r.otherMemberId) === Number(memberId) ? { ...r, otherMemberStatus: status } : r
      );

      // 2. 활성화된 방의 상대방 상태 갱신
      let updatedActiveRoom = state.activeRoom;
      if (state.activeRoom && Number(state.activeRoom.otherMemberId) === Number(memberId)) {
        updatedActiveRoom = {
          ...state.activeRoom,
          otherMemberStatus: status,
        };
      }

      // 3. 배너 정보 갱신
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
}));
