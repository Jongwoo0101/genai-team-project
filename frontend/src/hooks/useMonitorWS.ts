import { useState, useEffect, useRef, useCallback } from 'react';
import type { WSInitMsg, WSFrameMsg, WSStopMsg, WSResultMsg } from '../lib/types';

export function useMonitorWS(isMonitoring: boolean, employeeId: number, token: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [wsReady, setWsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<WSResultMsg | null>(null);

  useEffect(() => {
    if (!isMonitoring || !employeeId || !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWsReady(false);
      return;
    }

    // 모니터링 시작 시 상태 초기화
    setError(null);
    setLastResult(null);
    setWsReady(false);

    const wsUrl = import.meta.env.VITE_AI_WS_URL || 'ws://localhost:8765/ws/monitor';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      const initMsg: WSInitMsg = {
        type: 'init',
        employeeId,
        token,
      };
      ws.send(JSON.stringify(initMsg));
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'ready') {
          setWsReady(true);
        } else if (msg.type === 'error') {
          setError(msg.message);
        } else if (msg.type === 'result') {
          setLastResult(msg as WSResultMsg);
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    ws.onerror = () => {
      setError('AI 서버 연결 실패 - 로컬 서버를 실행해 주세요.');
    };

    ws.onclose = () => {
      setWsReady(false);
    };

    // 언마운트되거나 모니터링이 중단(의존성 변경)될 때 실행
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        const stopMsg: WSStopMsg = { type: 'stop' };
        ws.send(JSON.stringify(stopMsg));
      }
      ws.close();
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, [isMonitoring, employeeId, token]);

  const sendFrame = useCallback((base64: string) => {
    if (wsReady && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const frameMsg: WSFrameMsg = { type: 'frame', data: base64 };
      wsRef.current.send(JSON.stringify(frameMsg));
    }
  }, [wsReady]);

  return { sendFrame, wsReady, error, lastResult };
}
