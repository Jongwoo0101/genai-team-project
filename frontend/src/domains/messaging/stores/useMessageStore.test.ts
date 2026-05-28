import { describe, expect, it, beforeEach } from 'vitest';
import { useMessageStore } from './useMessageStore';
import type { ChatRoomResponse, ChatMessageResponse, ChatRoomDetailResponse } from '../types';

describe('useMessageStore', () => {
  beforeEach(() => {
    // Reset Zustand state before each test
    useMessageStore.setState({
      rooms: [],
      activeRoomId: null,
      activeRoom: null,
      bannerInfo: null,
    });
  });

  it('should initialize with default values', () => {
    const state = useMessageStore.getState();
    expect(state.rooms).toEqual([]);
    expect(state.activeRoomId).toBeNull();
    expect(state.activeRoom).toBeNull();
    expect(state.bannerInfo).toBeNull();
  });

  it('should set rooms and activeRoomId', () => {
    const testRooms: ChatRoomResponse[] = [
      {
        roomId: 1,
        otherMemberId: 10,
        otherMemberUsername: 'test_user',
        otherMemberStatus: 'WORKING',
        lastMessage: null,
        unreadCount: 0,
      },
    ];

    useMessageStore.getState().setRooms(testRooms);
    useMessageStore.getState().setActiveRoomId(1);

    const state = useMessageStore.getState();
    expect(state.rooms).toEqual(testRooms);
    expect(state.activeRoomId).toBe(1);
  });

  it('should add a message to active room', () => {
    const activeRoom: ChatRoomDetailResponse = {
      roomId: 1,
      otherMemberId: 10,
      otherMemberUsername: 'test_user',
      otherMemberStatus: 'WORKING',
      messages: [],
    };

    const message: ChatMessageResponse = {
      messageId: 100,
      roomId: 1,
      senderId: 2,
      senderUsername: 'me',
      content: 'Hello World',
      messageType: 'NORMAL',
      read: false,
      createdAt: '2026-05-28T18:00:00Z',
      readAt: null,
    };

    useMessageStore.setState({ activeRoomId: 1, activeRoom });
    useMessageStore.getState().addMessage(message);

    const state = useMessageStore.getState();
    expect(state.activeRoom?.messages).toContainEqual(message);
  });

  it('should update member status', () => {
    const testRooms: ChatRoomResponse[] = [
      {
        roomId: 1,
        otherMemberId: 10,
        otherMemberUsername: 'test_user',
        otherMemberStatus: 'WORKING',
        lastMessage: null,
        unreadCount: 0,
      },
    ];

    useMessageStore.setState({ rooms: testRooms });
    useMessageStore.getState().updateMemberStatus(10, 'MEETING');
    
    const state = useMessageStore.getState();
    expect(state.rooms[0].otherMemberStatus).toBe('MEETING');
  });
});
