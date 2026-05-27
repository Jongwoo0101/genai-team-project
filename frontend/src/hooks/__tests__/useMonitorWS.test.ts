import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMonitorWS } from '../useMonitorWS';

describe('useMonitorWS', () => {
  let originalWebSocket: unknown;
  let mockWebSocket: {
    send: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    readyState: number;
    onopen?: () => void;
    onmessage?: (e: unknown) => void;
  };

  beforeEach(() => {
    originalWebSocket = global.WebSocket;

    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1, // OPEN
    };

    // WebSocket은 `new`로 호출되므로 mockImplementation으로 생성자 모킹
    const MockWebSocket = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
      Object.assign(this, mockWebSocket);
      mockWebSocket = this as typeof mockWebSocket;
    });
    (global as unknown as { WebSocket: unknown }).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket as typeof WebSocket;
    vi.clearAllMocks();
  });

  it('does not connect if isMonitoring is false', () => {
    const { result } = renderHook(() => useMonitorWS(false, 1, 'token'));
    expect(global.WebSocket).not.toHaveBeenCalled();
    expect(result.current.wsReady).toBe(false);
  });

  it('connects and sends init msg if isMonitoring is true', () => {
    renderHook(() => useMonitorWS(true, 1, 'token'));

    // 환경변수 여부에 따라 URL이 동적이므로 any(String)으로 검증
    expect(global.WebSocket).toHaveBeenCalledWith(expect.any(String));

    // simulate open
    act(() => {
      mockWebSocket.onopen!();
    });

    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'init',
      employeeId: 1,
      token: 'token',
    }));
  });

  it('handles ready message and sets wsReady to true', () => {
    const { result } = renderHook(() => useMonitorWS(true, 1, 'token'));

    act(() => {
      mockWebSocket.onmessage!({ data: JSON.stringify({ type: 'ready' }) });
    });

    expect(result.current.wsReady).toBe(true);
  });

  it('sends frame only when wsReady is true', async () => {
    const { result } = renderHook(() => useMonitorWS(true, 1, 'token'));

    // WebSocket.OPEN 상수가 모킹 환경에서 정의되어 있는지 확인
    (global as unknown as { WebSocket: { OPEN: number } }).WebSocket.OPEN = 1;

    act(() => {
      mockWebSocket.onmessage!({ data: JSON.stringify({ type: 'ready' }) });
    });

    act(() => {
      result.current.sendFrame('base64data');
    });

    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'frame',
      data: 'base64data',
    }));
  });

  it('handles result messages', () => {
    const { result } = renderHook(() => useMonitorWS(true, 1, 'token'));

    act(() => {
      mockWebSocket.onmessage!({
        data: JSON.stringify({
          type: 'result',
          state: 'SLEEP',
          confidence: 0.95,
          fps: 15,
        }),
      });
    });

    expect(result.current.lastResult).toEqual({
      type: 'result',
      state: 'SLEEP',
      confidence: 0.95,
      fps: 15,
    });
  });
});

