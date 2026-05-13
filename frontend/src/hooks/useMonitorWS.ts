import { useState, useEffect, useRef, useCallback } from 'react';
import { WSInitMsg, WSFrameMsg, WSStopMsg, WSResultMsg } from '../lib/types';

export function useMonitorWS(isMonitoring: boolean, employeeId: number, token: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [wsReady, setWsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<WSResultMsg | null>(null);

  useEffect(() => {
    if (!isMonitoring || !employeeId || !token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWsReady(false);
      return;
    }

     
    setError(null);
     
    setLastResult(null);
     
    setWsReady(false);

    const ws = new WebSocket('ws://localhost:8765/ws/monitor');
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

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        const stopMsg: WSStopMsg = { type: 'stop' };
        ws.send(JSON.stringify(stopMsg));
      }
      ws.close();
      wsRef.current = null;
    };
  }, [isMonitoring, employeeId, token]);

  const sendFrame = useCallback((base64: string) => {
    if (wsReady && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const frameMsg: WSFrameMsg = { type: 'frame', data: base64 };
      wsRef.current.send(JSON.stringify(frameMsg));
    }
  }, [wsReady]);

  const stop = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const stopMsg: WSStopMsg = { type: 'stop' };
      wsRef.current.send(JSON.stringify(stopMsg));
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsReady(false);
  }, []);

  return { sendFrame, stop, wsReady, error, lastResult };
}
