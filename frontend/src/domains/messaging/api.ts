import type {
  ChatRoomResponse,
  ChatRoomDetailResponse,
  ChatMessageResponse,
  ReceiverStatusBannerResponse,
  ChatMessageType,
} from './types';
import { STORAGE_KEYS } from '../../lib/constants';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function requestWithAuth<T>(url: string, method: string = 'GET', body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token && token !== 'undefined' && token !== 'null') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${url}`, options);

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData?.message || errorMessage;
    } catch { /* ignore */ }
    throw new Error(errorMessage);
  }

  // 204 No Content 뿐만 아니라 Content-Length가 0이거나 본문이 빈 경우 안전하게 처리
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error('API 응답 파싱 실패:', text, err);
    throw new Error('서버 응답을 처리할 수 없습니다.');
  }
}

/** 내 채팅방 목록 조회 (최근 메시지 기준 최신순) */
export async function getRooms(): Promise<ChatRoomResponse[]> {
  return requestWithAuth<ChatRoomResponse[]>('/chat/rooms');
}

/** 채팅방 입장 (없으면 자동 생성, 미읽음 일괄 읽음 처리) */
export async function enterRoom(otherMemberId: number): Promise<ChatRoomDetailResponse> {
  return requestWithAuth<ChatRoomDetailResponse>(`/chat/rooms/${otherMemberId}/enter`, 'POST');
}

/** 메시지 전송 */
export async function sendMessage(
  roomId: number,
  content: string,
  messageType: ChatMessageType = 'NORMAL'
): Promise<ChatMessageResponse> {
  return requestWithAuth<ChatMessageResponse>(`/chat/rooms/${roomId}/messages`, 'POST', {
    content,
    messageType,
  });
}

/** 채팅창 상단 안내 배너 조회 */
export async function getStatusBanner(otherMemberId: number): Promise<ReceiverStatusBannerResponse> {
  return requestWithAuth<ReceiverStatusBannerResponse>(`/chat/rooms/${otherMemberId}/status-banner`);
}

/** 채팅방 읽음 처리 (채팅창 포커스 시 호출) */
export async function markAsRead(roomId: number): Promise<void> {
  return requestWithAuth<void>(`/chat/rooms/${roomId}/read`, 'POST');
}
