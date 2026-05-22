import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../../../lib/constants';
import * as api from '../../../lib/api';
import { parseWsEnvelope } from '../../../lib/wsEvent';

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
  approveJoinRequest: (roomId: number, requestId: number) => Promise<void>;
  rejectJoinRequest: (roomId: number, requestId: number) => Promise<void>;
  inviteUser: (roomId: number, inviteeId: number) => Promise<void>;
  acceptInvitation: (roomId: number, inviteId: number) => Promise<void>;
  declineInvitation: (roomId: number, inviteId: number) => Promise<void>;
  handleWebsocketEvent: (msg: unknown) => Promise<void>;
}

export const useVideoCallStore = create<VideoCallState>()(
  persist(
    (set, get) => ({
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
            participants: [], // 인원은 상세 조회를 통해 동기화
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
          // 입장 처리는 API 상 respondToJoinRequest/respondToInvitation 완료 후 
          // 또는 생성자가 입장할 때 수행됨. 
          // 여기서는 activeRoom 상세 정보를 갱신하고 스토어의 activeRoom을 설정한다.
          await get().loadActiveRoomDetail(roomId);
        } catch (err) {
          console.error('회의실 참여 실패:', err);
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

        const updatedParticipants = activeRoom.participants.map((p) =>
          p.id === participantId ? { ...p, isCamOn: !p.isCamOn } : p
        );

        set({
          activeRoom: {
            ...activeRoom,
            participants: updatedParticipants,
          },
        });
      },
      toggleMic: (participantId) => {
        const activeRoom = get().activeRoom;
        if (!activeRoom) return;

        const updatedParticipants = activeRoom.participants.map((p) =>
          p.id === participantId ? { ...p, isMicOn: !p.isMicOn } : p
        );

        set({
          activeRoom: {
            ...activeRoom,
            participants: updatedParticipants,
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
          await api.inviteToMeeting(roomId, inviteeId);
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
      handleWebsocketEvent: async (msg) => {
        const envelope = parseWsEnvelope(msg);
        if (!envelope) return;
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
            // joinRequests의 status를 'approved'로 갱신하여
            // EmployeeView의 useEffect가 감지하고 모달을 자동으로 열 수 있도록 함
            set((state) => ({
              joinRequests: state.joinRequests.map((r) =>
                r.requestId === acceptedParticipantId
                  ? { ...r, status: 'approved' as const }
                  : r
              ),
            }));
            await get().loadRooms();
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
    }),
    {
      name: STORAGE_KEYS.VIDEOCALL_STATE,
    }
  )
);

// 다른 브라우저 탭에서 변경 시 자동으로 연동되도록 이벤트 수신
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.VIDEOCALL_STATE) {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.VIDEOCALL_STATE);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.state) {
            const currentActive = useVideoCallStore.getState().activeRoom;
            const newRooms = parsed.state.rooms as VideoCallRoom[];
            const nextActive = currentActive
              ? newRooms.find((r) => r.roomId === currentActive.roomId) || null
              : null;
            
            useVideoCallStore.setState({
              rooms: newRooms,
              activeRoom: nextActive,
              joinRequests: parsed.state.joinRequests || [],
              invitations: parsed.state.invitations || [],
            });
          }
        }
      } catch (err) {
        console.error('videoCallStore storage 동기화 실패:', err);
      }
    }
  });
}
