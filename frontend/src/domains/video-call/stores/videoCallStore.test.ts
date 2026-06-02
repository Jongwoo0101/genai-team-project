import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WsEnvelope } from '../../../lib/wsEvent';

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

vi.mock('../../../lib/api', () => ({
  getMeetings: vi.fn().mockResolvedValue([]),
  getMeetingDetail: vi.fn(),
  createMeeting: vi.fn(),
  leaveMeeting: vi.fn().mockResolvedValue(undefined),
  endMeeting: vi.fn().mockResolvedValue(undefined),
  requestJoinMeeting: vi.fn(),
  respondToJoinRequest: vi.fn(),
  inviteToMeeting: vi.fn(),
  respondToInvitation: vi.fn(),
}));

import * as api from '../../../lib/api';
import { useVideoCallStore } from './videoCallStore';

const roomCreatedEvent: WsEnvelope = {
  event: 'ROOM_CREATED',
  data: { roomId: 1 },
  occurredAt: new Date().toISOString(),
  version: 'v1',
};

describe('videoCallStore', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
    useVideoCallStore.setState({
      ownerMemberId: null,
      rooms: [],
      activeRoom: null,
      joinRequests: [],
      invitations: [],
    });
  });

  it('should sync member context and clear state when ownerMemberId changes', () => {
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

  it('reuses the active team id for websocket-driven room refreshes', async () => {
    await useVideoCallStore.getState().loadRooms(77);

    await useVideoCallStore.getState().handleWebsocketEvent(roomCreatedEvent, 77);

    expect(api.getMeetings).toHaveBeenCalledWith(77);
    expect(api.getMeetings).toHaveBeenCalledTimes(2);
  });

  it('reuses the active team id after leaving a room', async () => {
    await useVideoCallStore.getState().loadRooms(33);

    await useVideoCallStore.getState().leaveRoom(99);

    expect(api.leaveMeeting).toHaveBeenCalledWith(99);
    expect(api.getMeetings).toHaveBeenLastCalledWith(33);
  });
});
