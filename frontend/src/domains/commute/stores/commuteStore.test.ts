import { describe, expect, it } from 'vitest';
import { createEmployeeScopedCommuteState } from './commuteStore';

describe('createEmployeeScopedCommuteState', () => {
  it('keeps state when same employee context is used', () => {
    const currentState = {
      ownerEmployeeId: 1,
      commuteStatus: 'WORK' as const,
      userState: '근무 중' as const,
      checkInTime: '2026-05-22 09:00:00',
      checkOutTime: null,
      logs: [{ id: '1-log', employeeId: 1, employeeName: 'emp1', type: 'IN' as const, timestampIso: '2026-05-22T09:00:00.000Z', timestampDisplay: '2026. 05. 22. 09:00:00', epochMs: 1, dateStr: '2026-05-22' }],
      isCameraActive: true,
      cameraStream: null,
      directPings: [{ id: '1', employeeId: 1, fromName: 'manager', message: 'ping', timestampIso: '2026-05-22T09:00:00.000Z', timestampDisplay: '2026. 05. 22. 09:00:00', epochMs: 1, status: 'pending' as const }],
    };

    const nextState = createEmployeeScopedCommuteState(currentState, 1);
    expect(nextState).toBe(currentState);
  });

  it('resets commute state when employee context changes', () => {
    const currentState = {
      ownerEmployeeId: 1,
      commuteStatus: 'WORK' as const,
      userState: '근무 중' as const,
      checkInTime: '2026-05-22 09:00:00',
      checkOutTime: null,
      logs: [{ id: '1-log', employeeId: 1, employeeName: 'emp1', type: 'IN' as const, timestampIso: '2026-05-22T09:00:00.000Z', timestampDisplay: '2026. 05. 22. 09:00:00', epochMs: 1, dateStr: '2026-05-22' }],
      isCameraActive: true,
      cameraStream: null,
      directPings: [
        { id: '1', employeeId: 1, fromName: 'manager', message: 'ping1', timestampIso: '2026-05-22T09:00:00.000Z', timestampDisplay: '2026. 05. 22. 09:00:00', epochMs: 1, status: 'pending' as const },
        { id: '2', employeeId: 2, fromName: 'manager', message: 'ping2', timestampIso: '2026-05-22T09:01:00.000Z', timestampDisplay: '2026. 05. 22. 09:01:00', epochMs: 2, status: 'pending' as const },
      ],
    };

    const nextState = createEmployeeScopedCommuteState(currentState, 2);
    expect(nextState.ownerEmployeeId).toBe(2);
    expect(nextState.commuteStatus).toBe('NONE');
    expect(nextState.userState).toBe('오프라인');
    expect(nextState.checkInTime).toBeNull();
    expect(nextState.logs).toEqual([]);
    expect(nextState.isCameraActive).toBe(false);
    expect(nextState.directPings).toEqual([
      { id: '2', employeeId: 2, fromName: 'manager', message: 'ping2', timestampIso: '2026-05-22T09:01:00.000Z', timestampDisplay: '2026. 05. 22. 09:01:00', epochMs: 2, status: 'pending' },
    ]);
  });
});
