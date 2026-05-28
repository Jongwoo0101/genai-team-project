import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '../../../lib/constants';
import * as api from '../../../lib/api';
import type { WsEnvelope } from '../../../lib/wsEvent';
import { userScopedStorage, getScopedKey } from '../../../lib/userScopedStorage';

const toNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null;

const toString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

export interface Participant {
  id: number;
  name: string;
  isCamOn: boolean;
  isMicOn: boolean;
}

export interface VideoCallRoom {
  roomId: number;
  title: string;
  hostId: number;
  hostName: string;
  participants: Participant[];
  createdAt: string;
}

export interface JoinRequest {
  requestId: number;
  roomId: number;
  userId: number;
  userName: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Invitation {
  inviteId: number;
  roomId: number;
  roomTitle: string;
  hostName: string;
  inviteeId: number;
  inviteeName: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface VideoCallState {
  ownerMemberId: number | null;
  rooms: VideoCallRoom[];
  activeRoom: VideoCallRoom | null;
  joinRequests: JoinRequest[];
  invitations: Invitation[];
  loadRooms: () => Promise<void>;
  loadActiveRoomDetail: (roomId: number) => Promise<void>;
  createRoom: (title: string) => Promise<void>;
  joinRoom: (roomId: number) => Promise<void>;
  leaveRoom: (roomId: number) => Promise<void>;
  endRoom: (roomId: number) => Promise<void>;
  toggleCam: (participantId: number) => void;
  toggleMic: (participantId: number) => void;
  clearRooms: () => void;
  requestJoinRoom: (roomId: number) => Promise<void>;
  enterRoom: (roomId: number, userId: number) => Promise<'joined' | 'requested' | 'pending'>;
  approveJoinRequest: (roomId: number, requestId: number) => Promise<void>;
  rejectJoinRequest: (roomId: number, requestId: number) => Promise<void>;
  inviteUser: (roomId: number, inviteeId: number) => Promise<void>;
  acceptInvitation: (roomId: number, inviteId: number) => Promise<void>;
  declineInvitation: (roomId: number, inviteId: number) => Promise<void>;
  handleWebsocketEvent: (envelope: WsEnvelope) => Promise<void>;
  syncMemberContext: (memberId: number) => void;
}

const createMemberScopedVideoCallState = (
  prevState: Pick<VideoCallState, 'ownerMemberId' | 'rooms' | 'activeRoom' | 'joinRequests' | 'invitations'>,
  memberId: number
) => {
  if (prevState.ownerMemberId === memberId) return prevState;
  return {
    ownerMemberId: memberId,
    rooms: [],
    activeRoom: null,
    joinRequests: [],
    invitations: [],
  };
};

export const useVideoCallStore = create<VideoCallState>()(
  persist(
    (set, get) => ({
      ownerMemberId: null,
      rooms: [],
      activeRoom: null,
      joinRequests: [],
      invitations: [],

      loadRooms: async () => {
        try {
          const list = await api.getMeetings();
          const mapped: VideoCallRoom[] = list.map((r) => ({
            roomId: r.roomId,
            title: r.title,
            hostId: r.hostId,
            hostName: r.hostUsername,
            // ✅ 수정: participants를 빈 배열로 버리지 않고 기존 activeRoom의 참가자 유지
            participants: get().activeRoom?.roomId === r.roomId
              ? get().activeRoom!.participants
              : [],
            createdAt: new Date(r.createdAt).toLocaleTimeString('ko-KR'),
          }));
          set({ rooms: mapped });
        } catch (err) {
          console.error('회의실 목록 로드 실패:', err);
        }
      },

      loadActiveRoomDetail: async (roomId) => {
        try {
          const detail = await api.getMeetingDetail(roomId);
          const activeParticipants: Participant[] = detail.participants
            .filter((p) => p.requestStatus === 'ACCEPTED')
            .map((p) => ({
              id: p.memberId,
              name: p.username,
              isCamOn: true,
              isMicOn: true,
            }));
          const mappedActive: VideoCallRoom = {
            roomId: detail.roomId,
            title: detail.title,
            hostId: detail.hostId,
            hostName: detail.hostUsername,
            participants: activeParticipants,
            createdAt: new Date(detail.createdAt).toLocaleTimeString('ko-KR'),
          };
          set({ activeRoom: mappedActive });
        } catch (err) {
          console.error('활성 회의실 상세 로드 실패:', err);
        }
      },

      createRoom: async (title) => {
        try {
          const room = await api.createMeeting(title);
          const initialParticipant: Participant = {
            id: room.hostId,
            name: room.hostUsername,
            isCamOn: true,
            isMicOn: true,
          };
          const newRoom: VideoCallRoom = {
            roomId: room.roomId,
            title: room.title,
            hostId: room.hostId,
            hostName: room.hostUsername,
            participants: [initialParticipant],
            createdAt: new Date(room.createdAt).toLocaleTimeString('ko-KR'),
          };
          set((state) => ({
            rooms: [newRoom, ...state.rooms],
            activeRoom: newRoom,
          }));
        } catch (err) {
          console.error('회의실 생성 실패:', err);
          throw err;
        }
      },

      joinRoom: async (roomId) => {
        try {
          // ✅ 수정: 상세 조회로 participants(ACCEPTED 목록) 먼저 세팅
          await get().loadActiveRoomDetail(roomId);

          // loadActiveRoomDetail 후 activeRoom이 세팅됐는지 확인
          // 세팅이 됐다면 rooms 목록도 동기화
          const active = get().activeRoom;
          if (active && active.roomId === roomId) {
            set((state) => ({
              rooms: state.rooms.map((r) =>
                r.roomId === roomId ? { ...r, participants: active.participants } : r
              ),
            }));
          }
        } catch (err) {
          console.error('회의실 참여 실패:', err);
          throw err;
        }
      },

      leaveRoom: async (roomId) => {
        try {
          await api.leaveMeeting(roomId);
          set({ activeRoom: null });
          await get().loadRooms();
        } catch (err) {
          console.error('회의실 나가기 실패:', err);
        }
      },

      endRoom: async (roomId) => {
        try {
          await api.endMeeting(roomId);
          set({ activeRoom: null });
          await get().loadRooms();
        } catch (err) {
          console.error('회의실 종료 실패:', err);
        }
      },

      toggleCam: (participantId) => {
        const activeRoom = get().activeRoom;
        if (!activeRoom) return;
        set({
          activeRoom: {
            ...activeRoom,
            participants: activeRoom.participants.map((p) =>
              p.id === participantId ? { ...p, isCamOn: !p.isCamOn } : p
            ),
          },
        });
      },

      toggleMic: (participantId) => {
        const activeRoom = get().activeRoom;
        if (!activeRoom) return;
        set({
          activeRoom: {
            ...activeRoom,
            participants: activeRoom.participants.map((p) =>
              p.id === participantId ? { ...p, isMicOn: !p.isMicOn } : p
            ),
          },
        });
      },

      clearRooms: () => {
        set({ rooms: [], activeRoom: null, joinRequests: [], invitations: [] });
      },

      requestJoinRoom: async (roomId) => {
        try {
          await api.requestJoinMeeting(roomId);
        } catch (err) {
          console.error('회의실 참여 요청 실패:', err);
          throw err;
        }
      },

      enterRoom: async (roomId, userId) => {
        const targetRoom = get().rooms.find((r) => r.roomId === roomId);
        if (targetRoom?.hostId === userId) {
          await get().joinRoom(roomId);
          return 'joined';
        }

        try {
          const detail = await api.getMeetingDetail(roomId);
          const isAccepted = detail.participants.some(
            (p) => p.memberId === userId && p.requestStatus === 'ACCEPTED'
          );
          if (isAccepted) {
            await get().joinRoom(roomId);
            return 'joined';
          }
        } catch {
          // 상세 조회 실패 시 아래 대기/요청 처리로 폴백
        }

        const hasPendingRequest = get().joinRequests.some(
          (r) => r.roomId === roomId && r.userId === userId && r.status === 'pending'
        );
        if (hasPendingRequest) return 'pending';

        await get().requestJoinRoom(roomId);
        return 'requested';
      },

      approveJoinRequest: async (roomId, requestId) => {
        try {
          await api.respondToJoinRequest(roomId, requestId, true);
          set((state) => ({
            joinRequests: state.joinRequests.filter((r) => r.requestId !== requestId),
          }));
          await get().loadActiveRoomDetail(roomId);
        } catch (err) {
          console.error('참여 요청 승인 실패:', err);
        }
      },

      rejectJoinRequest: async (roomId, requestId) => {
        try {
          await api.respondToJoinRequest(roomId, requestId, false);
          set((state) => ({
            joinRequests: state.joinRequests.filter((r) => r.requestId !== requestId),
          }));
        } catch (err) {
          console.error('참여 요청 거절 실패:', err);
        }
      },

      inviteUser: async (roomId, inviteeId) => {
        try {
          const res = await api.inviteToMeeting(roomId, inviteeId);
          const activeRoom = get().activeRoom;
          if (activeRoom) {
            const inv: Invitation = {
              inviteId: res.participantId,
              roomId,
              roomTitle: activeRoom.title,
              hostName: activeRoom.hostName,
              inviteeId,
              inviteeName: res.username,
              status: 'pending',
            };
            set((state) => ({
              invitations: [inv, ...state.invitations.filter((i) => i.inviteId !== inv.inviteId)],
            }));
          }
        } catch (err) {
          console.error('직원 초대 실패:', err);
          throw err;
        }
      },

      acceptInvitation: async (roomId, inviteId) => {
        try {
          await api.respondToInvitation(roomId, true);
          set((state) => ({
            invitations: state.invitations.filter((i) => i.inviteId !== inviteId),
          }));
          await get().loadActiveRoomDetail(roomId);
        } catch (err) {
          console.error('초대 수락 실패:', err);
        }
      },

      declineInvitation: async (roomId, inviteId) => {
        try {
          await api.respondToInvitation(roomId, false);
          set((state) => ({
            invitations: state.invitations.filter((i) => i.inviteId !== inviteId),
          }));
        } catch (err) {
          console.error('초대 거절 실패:', err);
        }
      },

      handleWebsocketEvent: async (envelope) => {
        const { event, data } = envelope;

        switch (event) {
          case 'ROOM_CREATED': {
            await get().loadRooms();
            break;
          }
          case 'ROOM_ENDED': {
            const endedRoomId = toNumber(data.roomId);
            if (!endedRoomId) break;
            set((state) => ({
              rooms: state.rooms.filter((r) => r.roomId !== endedRoomId),
              activeRoom: state.activeRoom?.roomId === endedRoomId ? null : state.activeRoom,
            }));
            break;
          }
          case 'MEMBER_JOINED':
          case 'MEMBER_LEFT': {
            const roomId = toNumber(data.roomId);
            if (!roomId) break;
            await get().loadRooms();
            if (get().activeRoom?.roomId === roomId) {
              await get().loadActiveRoomDetail(roomId);
            }
            break;
          }
          case 'JOIN_REQUESTED': {
            const participantId = toNumber(data.participantId);
            const roomId = toNumber(data.roomId);
            const memberId = toNumber(data.memberId);
            const username = toString(data.username);
            if (!participantId || !roomId || !memberId || !username) break;
            const req: JoinRequest = {
              requestId: participantId,
              roomId,
              userId: memberId,
              userName: username,
              status: 'pending',
            };
            set((state) => ({
              joinRequests: [req, ...state.joinRequests.filter((r) => r.requestId !== req.requestId)],
            }));
            break;
          }
          case 'INVITED': {
            const participantId = toNumber(data.participantId);
            const roomId = toNumber(data.roomId);
            const memberId = toNumber(data.memberId);
            const username = toString(data.username);
            if (!participantId || !roomId || !memberId || !username) break;
            const inv: Invitation = {
              inviteId: participantId,
              roomId,
              roomTitle: toString(data.roomTitle) || '화상 회의실',
              hostName: toString(data.hostUsername) || '매니저',
              inviteeId: memberId,
              inviteeName: username,
              status: 'pending',
            };
            set((state) => ({
              invitations: [inv, ...state.invitations.filter((i) => i.inviteId !== inv.inviteId)],
            }));
            break;
          }
          case 'REQUEST_ACCEPTED': {
            const roomId = toNumber(data.roomId);
            const acceptedParticipantId = toNumber(data.participantId);
            if (!roomId || !acceptedParticipantId) break;
            set((state) => ({
              joinRequests: state.joinRequests.map((r) =>
                r.requestId === acceptedParticipantId
                  ? { ...r, status: 'approved' as const }
                  : r
              ),
            }));
            await get().loadRooms();
            // ✅ 수정: joinRoom 호출 전 loadActiveRoomDetail로 participants 먼저 세팅
            await get().joinRoom(roomId);
            break;
          }
          case 'REQUEST_REJECTED': {
            const requestId = toNumber(data.participantId);
            if (!requestId) break;
            set((state) => ({
              joinRequests: state.joinRequests.filter((r) => r.requestId !== requestId),
            }));
            break;
          }
          default:
            break;
        }
      },
      syncMemberContext: (memberId) => {
        set((state) => createMemberScopedVideoCallState(state, memberId));
      },
    }),
    {
      name: STORAGE_KEYS.VIDEOCALL_STATE,
      storage: createJSONStorage(() => userScopedStorage),
    }
  )
);

// 다른 브라우저 탭에서 변경 시 자동으로 연동되도록 이벤트 수신
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    const currentOwnerId = useVideoCallStore.getState().ownerMemberId;
    const scopedKey = getScopedKey(STORAGE_KEYS.VIDEOCALL_STATE, currentOwnerId);

    if (e.key === scopedKey) {
      try {
        const data = localStorage.getItem(scopedKey);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.state) {
            if (currentOwnerId !== null && parsed.state.ownerMemberId === currentOwnerId) {
              const currentActive = useVideoCallStore.getState().activeRoom;
              const newRooms = parsed.state.rooms as VideoCallRoom[];
              const nextActive = currentActive
                ? newRooms.find((r) => r.roomId === currentActive.roomId) || null
                : null;

              useVideoCallStore.setState({
                ownerMemberId: parsed.state.ownerMemberId,
                rooms: newRooms,
                activeRoom: nextActive,
                joinRequests: parsed.state.joinRequests || [],
                invitations: parsed.state.invitations || [],
              });
            }
          }
        }
      } catch (err) {
        console.error('videoCallStore storage 동기화 실패:', err);
      }
    }
  });
}
