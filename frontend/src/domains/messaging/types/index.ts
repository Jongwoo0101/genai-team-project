export type UserStatus = 'WORKING' | 'MEETING' | 'AWAY' | 'FOCUS' | 'OFFLINE';
export type ChatMessageType = 'NORMAL' | 'URGENT';
export type ChatRoomType = 'DIRECT' | 'TEAM';

export interface ChatMessageResponse {
  messageId: number;
  roomId: number;
  roomType: ChatRoomType;
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
  roomType: ChatRoomType;
  otherMemberId: number | null;
  otherMemberUsername: string | null;
  otherMemberStatus: UserStatus | null;
  roomName: string | null;
  participantCount: number;
  lastMessage: ChatMessageResponse | null;
  unreadCount: number;
}

export interface TeamParticipant {
  memberId: number;
  username: string;
  status: UserStatus;
}

export interface ChatRoomDetailResponse {
  roomId: number;
  otherMemberId?: number;
  otherMemberUsername?: string;
  otherMemberStatus?: UserStatus;
  roomName?: string;
  managerId?: number;
  participants?: TeamParticipant[];
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

export interface TeamChatMemberJoinedPayload {
  memberId: number;
  username: string;
  status: UserStatus;
}

