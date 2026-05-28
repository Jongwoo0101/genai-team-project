import type { ChatRoom, Message, UserStatus } from './types';
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

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

/** 팀에 소속된 채팅방 목록 조회 */
export async function getRooms(teamId: string): Promise<ChatRoom[]> {
  return requestWithAuth<ChatRoom[]>(`/v1/messages/rooms?teamId=${teamId}`);
}

/** 채팅방 이전 메시지 조회 */
export async function getRoomMessages(roomId: string, page: number = 0, size: number = 50): Promise<{ messages: Message[]; hasNext: boolean }> {
  return requestWithAuth<{ messages: Message[]; hasNext: boolean }>(`/v1/messages/room/${roomId}?page=${page}&size=${size}`);
}

/** 특정 유저의 현재 상태 조회 */
export async function getUserStatus(userId: string): Promise<{ userId: string; currentStatus: UserStatus }> {
  return requestWithAuth<{ userId: string; currentStatus: UserStatus }>(`/v1/users/${userId}/status`);
}
