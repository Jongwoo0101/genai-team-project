export type UserStatus = 'WORKING' | 'MEETING' | 'AWAY' | 'FOCUS' | 'OFFLINE';
export type ChatMessageType = 'NORMAL' | 'URGENT';

export interface ChatMessageResponse {
  messageId: number;
  roomId: number;
  senderId: number;
  senderUsername: string;
  content: string;
  messageType: ChatMessageType;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface ChatRoomResponse {
  roomId: number;
  otherMemberId: number;
  otherMemberUsername: string;
  otherMemberStatus: UserStatus;
  lastMessage: ChatMessageResponse | null;
  unreadCount: number;
}

export interface ChatRoomDetailResponse {
  roomId: number;
  otherMemberId: number;
  otherMemberUsername: string;
  otherMemberStatus: UserStatus;
  messages: ChatMessageResponse[];
}

export interface ReceiverStatusBannerResponse {
  otherMemberId: number;
  otherMemberUsername: string;
  otherMemberStatus: UserStatus;
  showBanner: boolean;
  canSendUrgent: boolean;
  bannerMessage: string | null;
}

export interface ChatMessagePayload {
  roomId: number;
  messageId: number;
  senderId: number;
  senderUsername: string;
  content: string;
  messageType: ChatMessageType;
  createdAt: string;
}

export interface ChatReadPayload {
  roomId: number;
  readByMemberId: number;
}
