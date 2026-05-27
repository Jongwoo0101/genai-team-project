import { vi, describe, expect, it } from 'vitest';

// Mock localStorage globally before importing the store
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

import { useVideoCallStore } from './videoCallStore';

describe('videoCallStore', () => {
  it('should sync member context and clear state when ownerMemberId changes', () => {
    // Initial state setup
    useVideoCallStore.setState({
      ownerMemberId: 1,
      rooms: [
        {
          roomId: 101,
          title: 'Test Room',
          hostId: 1,
          hostName: 'host1',
          participants: [],
          createdAt: '12:00',
        },
      ],
      activeRoom: {
        roomId: 101,
        title: 'Test Room',
        hostId: 1,
        hostName: 'host1',
        participants: [],
        createdAt: '12:00',
      },
      joinRequests: [],
      invitations: [],
    });

    // Call syncMemberContext with a different member ID (e.g., 2)
    useVideoCallStore.getState().syncMemberContext(2);

    const stateAfterChange = useVideoCallStore.getState();
    expect(stateAfterChange.ownerMemberId).toBe(2);
    expect(stateAfterChange.rooms).toEqual([]);
    expect(stateAfterChange.activeRoom).toBeNull();
    expect(stateAfterChange.joinRequests).toEqual([]);
    expect(stateAfterChange.invitations).toEqual([]);
  });

  it('should keep state when syncMemberContext is called with the same ownerMemberId', () => {
    const initialRooms = [
      {
        roomId: 101,
        title: 'Test Room',
        hostId: 1,
        hostName: 'host1',
        participants: [],
        createdAt: '12:00',
      },
    ];

    useVideoCallStore.setState({
      ownerMemberId: 1,
      rooms: initialRooms,
      activeRoom: null,
      joinRequests: [],
      invitations: [],
    });

    useVideoCallStore.getState().syncMemberContext(1);

    const stateAfterSameCall = useVideoCallStore.getState();
    expect(stateAfterSameCall.ownerMemberId).toBe(1);
    expect(stateAfterSameCall.rooms).toEqual(initialRooms);
  });
});
