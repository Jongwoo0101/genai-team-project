import { create } from 'zustand';
import type { ChatRoom, Message, UserStatus } from '../types';

interface MessageState {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  messages: Message[];
  receiverStatusMap: Record<string, UserStatus>;
  
  setRooms: (rooms: ChatRoom[]) => void;
  setActiveRoomId: (roomId: string) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateUserStatus: (userId: string, status: UserStatus) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  rooms: [],
  activeRoomId: null,
  messages: [],
  receiverStatusMap: {},
  
  setRooms: (rooms) => set({ rooms }),
  setActiveRoomId: (activeRoomId) => set({ activeRoomId, messages: [] }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateUserStatus: (userId, status) => set((state) => ({
    receiverStatusMap: { ...state.receiverStatusMap, [userId]: status }
  })),
}));
