import { renderHook, act } from '@testing-library/react';
import { useMonitorWS } from '../useMonitorWS';

describe('useMonitorWS', () => {
  let originalWebSocket: unknown;
  let mockWebSocket: { send: jest.Mock; close: jest.Mock; readyState: number; onopen?: () => void; onmessage?: (e: unknown) => void };

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1, // OPEN
    };

    (global as unknown as { WebSocket: unknown }).WebSocket = jest.fn(() => mockWebSocket);
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    jest.clearAllMocks();
  });

  it('does not connect if isMonitoring is false', () => {
    const { result } = renderHook(() => useMonitorWS(false, 1, 'token'));
    expect(global.WebSocket).not.toHaveBeenCalled();
    expect(result.current.wsReady).toBe(false);
  });

  it('connects and sends init msg if isMonitoring is true', () => {
    renderHook(() => useMonitorWS(true, 1, 'token'));
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8765/ws/monitor');
    
    // simulate open
    act(() => {
      mockWebSocket.onopen();
    });

    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'init',
      employeeId: 1,
      token: 'token'
    }));
  });

  it('handles ready message and sets wsReady to true', () => {
    const { result } = renderHook(() => useMonitorWS(true, 1, 'token'));
    
    act(() => {
      mockWebSocket.onmessage({ data: JSON.stringify({ type: 'ready' }) });
    });

    expect(result.current.wsReady).toBe(true);
  });

  it('sends frame only when wsReady is true', () => {
    const { result } = renderHook(() => useMonitorWS(true, 1, 'token'));
    
    act(() => {
      mockWebSocket.onmessage({ data: JSON.stringify({ type: 'ready' }) });
    });

    act(() => {
      result.current.sendFrame('base64data');
    });

    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'frame',
      data: 'base64data'
    }));
  });

  it('handles result messages', () => {
    const { result } = renderHook(() => useMonitorWS(true, 1, 'token'));
    
    act(() => {
      mockWebSocket.onmessage({
        data: JSON.stringify({
          type: 'result',
          state: 'SLEEP',
          confidence: 0.95,
          fps: 15
        })
      });
    });

    expect(result.current.lastResult).toEqual({
      type: 'result',
      state: 'SLEEP',
      confidence: 0.95,
      fps: 15
    });
  });

  it('calls stop and closes websocket', () => {
    const { result } = renderHook(() => useMonitorWS(true, 1, 'token'));
    
    act(() => {
      result.current.stop();
    });

    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'stop' }));
    expect(mockWebSocket.close).toHaveBeenCalled();
    expect(result.current.wsReady).toBe(false);
  });
});
