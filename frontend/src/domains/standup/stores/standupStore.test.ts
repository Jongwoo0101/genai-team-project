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
  getTeamStandups: vi.fn().mockResolvedValue({ standups: [] }),
  createStandupGoal: vi.fn(),
  createStandupResult: vi.fn(),
  getMyTodayStandup: vi.fn(),
}));

import * as api from '../../../lib/api';
import { useStandupStore } from './standupStore';

describe('standupStore', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
    useStandupStore.setState({
      ownerMemberId: null,
      standups: [],
    });
  });

  it('passes teamId when loading team standups directly', async () => {
    await useStandupStore.getState().loadTeamStandups('2026-06-02', 55);

    expect(api.getTeamStandups).toHaveBeenCalledWith('2026-06-02', 55);
  });

  it('passes teamId when refreshing after a websocket standup update', async () => {
    const goalUpdatedEvent: WsEnvelope = {
      event: 'GOAL_UPDATED',
      data: {},
      occurredAt: '2026-06-02T00:00:00.000Z',
      version: 'v1',
    };

    await useStandupStore.getState().handleWebsocketEvent(goalUpdatedEvent, 55);

    expect(api.getTeamStandups).toHaveBeenCalledWith('2026-06-02', 55);
  });
});
