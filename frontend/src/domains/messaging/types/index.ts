export type UserStatus = 'WORKING' | 'MEETING' | 'RESTING' | 'OFFLINE';

export interface ChatUser {
  id: string;
  name: string;
  avatarUrl?: string;
  status: UserStatus;
}

export interface Message {
  messageId: string;
  roomId: string;
  senderId: string;
  content: string;
  isUrgent: boolean;
  createdAt: string;
}

export interface ChatRoom {
  roomId: string;
  roomName: string;
  type: 'TEAM' | 'DM';
  members: ChatUser[];
  unreadCount: number;
}
