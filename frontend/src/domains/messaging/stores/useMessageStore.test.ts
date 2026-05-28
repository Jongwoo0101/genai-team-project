import { describe, expect, it, beforeEach } from 'vitest';
import { useMessageStore } from './useMessageStore';
import type { ChatRoom, Message } from '../types';

describe('useMessageStore', () => {
  beforeEach(() => {
    // Reset Zustand state before each test
    useMessageStore.setState({
      rooms: [],
      activeRoomId: null,
      messages: [],
      receiverStatusMap: {},
    });
  });

  it('should initialize with default values', () => {
    const state = useMessageStore.getState();
    expect(state.rooms).toEqual([]);
    expect(state.activeRoomId).toBeNull();
    expect(state.messages).toEqual([]);
    expect(state.receiverStatusMap).toEqual({});
  });

  it('should set rooms and activeRoomId', () => {
    const testRooms: ChatRoom[] = [
      {
        roomId: 'room-1',
        roomName: 'Team 1 Channel',
        type: 'TEAM',
        members: [],
        unreadCount: 0,
      },
    ];

    useMessageStore.getState().setRooms(testRooms);
    useMessageStore.getState().setActiveRoomId('room-1');

    const state = useMessageStore.getState();
    expect(state.rooms).toEqual(testRooms);
    expect(state.activeRoomId).toBe('room-1');
  });

  it('should add a message', () => {
    const message: Message = {
      messageId: 'msg-1',
      roomId: 'room-1',
      senderId: 'user-1',
      content: 'Hello World',
      isUrgent: false,
      createdAt: '2026-05-28T18:00:00Z',
    };

    useMessageStore.getState().addMessage(message);
    const state = useMessageStore.getState();
    expect(state.messages).toContainEqual(message);
  });

  it('should update user status', () => {
    useMessageStore.getState().updateUserStatus('user-1', 'MEETING');
    const state = useMessageStore.getState();
    expect(state.receiverStatusMap['user-1']).toBe('MEETING');
  });
});
