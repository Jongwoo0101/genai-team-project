import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../../../lib/constants';

export interface Participant {
  id: number;
  name: string;
  isCamOn: boolean;
  isMicOn: boolean;
}

export interface VideoCallRoom {
  roomId: string;
  title: string;
  hostId: number;
  hostName: string;
  participants: Participant[];
  createdAt: string;
}

export interface JoinRequest {
  requestId: string;
  roomId: string;
  userId: number;
  userName: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Invitation {
  inviteId: string;
  roomId: string;
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
  createRoom: (title: string, hostId: number, hostName: string) => void;
  joinRoom: (roomId: string, participantId: number, participantName: string) => void;
  leaveRoom: (participantId: number) => void;
  toggleCam: (participantId: number) => void;
  toggleMic: (participantId: number) => void;
  clearRooms: () => void;
  requestJoinRoom: (roomId: string, userId: number, userName: string) => void;
  approveJoinRequest: (requestId: string) => void;
  rejectJoinRequest: (requestId: string) => void;
  inviteUser: (roomId: string, inviteeId: number, inviteeName: string, roomTitle: string, hostName: string) => void;
  acceptInvitation: (inviteId: string) => void;
  declineInvitation: (inviteId: string) => void;
}

export const useVideoCallStore = create<VideoCallState>()(
  persist(
    (set, get) => ({
      rooms: [],
      activeRoom: null,
      joinRequests: [],
      invitations: [],
      createRoom: (title, hostId, hostName) => {
        const roomId = `room-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const initialParticipant: Participant = {
          id: hostId,
          name: hostName,
          isCamOn: true,
          isMicOn: true,
        };

        const newRoom: VideoCallRoom = {
          roomId,
          title,
          hostId,
          hostName,
          participants: [initialParticipant],
          createdAt: new Date().toLocaleTimeString('ko-KR'),
        };

        set((state) => ({
          rooms: [newRoom, ...state.rooms],
          activeRoom: newRoom,
        }));
      },
      joinRoom: (roomId, participantId, participantName) => {
        const rooms = get().rooms;
        const targetRoom = rooms.find((r) => r.roomId === roomId);
        if (!targetRoom) return;

        // 이미 참가해 있다면 무시
        if (targetRoom.participants.some((p) => p.id === participantId)) {
          set({ activeRoom: targetRoom });
          return;
        }

        const newParticipant: Participant = {
          id: participantId,
          name: participantName,
          isCamOn: true,
          isMicOn: true,
        };

        const updatedRoom = {
          ...targetRoom,
          participants: [...targetRoom.participants, newParticipant],
        };

        const updatedRooms = rooms.map((r) =>
          r.roomId === roomId ? updatedRoom : r
        );

        set({
          rooms: updatedRooms,
          activeRoom: updatedRoom,
        });
      },
      leaveRoom: (participantId) => {
        const activeRoom = get().activeRoom;
        if (!activeRoom) return;

        const rooms = get().rooms;
        const updatedParticipants = activeRoom.participants.filter(
          (p) => p.id !== participantId
        );

        let updatedRooms: VideoCallRoom[];

        if (updatedParticipants.length === 0) {
          // 더 이상 참가자가 없으면 방 폭파
          updatedRooms = rooms.filter((r) => r.roomId !== activeRoom.roomId);
        } else {
          // 호스트가 나가고 참가자가 남았으면 첫 번째 사람을 임시 호스트로 지정
          const isHostLeaving = activeRoom.hostId === participantId;
          const newHost = isHostLeaving ? updatedParticipants[0] : null;

          const updatedRoom: VideoCallRoom = {
            ...activeRoom,
            participants: updatedParticipants,
            hostId: newHost ? newHost.id : activeRoom.hostId,
            hostName: newHost ? newHost.name : activeRoom.hostName,
          };
          updatedRooms = rooms.map((r) =>
            r.roomId === activeRoom.roomId ? updatedRoom : r
          );
        }

        set({
          rooms: updatedRooms,
          activeRoom: null,
        });
      },
      toggleCam: (participantId) => {
        const activeRoom = get().activeRoom;
        if (!activeRoom) return;

        const updatedParticipants = activeRoom.participants.map((p) =>
          p.id === participantId ? { ...p, isCamOn: !p.isCamOn } : p
        );

        const updatedRoom = {
          ...activeRoom,
          participants: updatedParticipants,
        };

        const updatedRooms = get().rooms.map((r) =>
          r.roomId === activeRoom.roomId ? updatedRoom : r
        );

        set({
          rooms: updatedRooms,
          activeRoom: updatedRoom,
        });
      },
      toggleMic: (participantId) => {
        const activeRoom = get().activeRoom;
        if (!activeRoom) return;

        const updatedParticipants = activeRoom.participants.map((p) =>
          p.id === participantId ? { ...p, isMicOn: !p.isMicOn } : p
        );

        const updatedRoom = {
          ...activeRoom,
          participants: updatedParticipants,
        };

        const updatedRooms = get().rooms.map((r) =>
          r.roomId === activeRoom.roomId ? updatedRoom : r
        );

        set({
          rooms: updatedRooms,
          activeRoom: updatedRoom,
        });
      },
      clearRooms: () => {
        set({ rooms: [], activeRoom: null, joinRequests: [], invitations: [] });
      },
      requestJoinRoom: (roomId, userId, userName) => {
        const newRequest: JoinRequest = {
          requestId: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          roomId,
          userId,
          userName,
          status: 'pending',
        };
        set((state) => ({
          joinRequests: [newRequest, ...state.joinRequests],
        }));
      },
      approveJoinRequest: (requestId) => {
        const req = get().joinRequests.find((r) => r.requestId === requestId);
        if (!req) return;

        // 요청 승인 처리
        const updatedRequests = get().joinRequests.map((r) =>
          r.requestId === requestId ? { ...r, status: 'approved' as const } : r
        );

        set({ joinRequests: updatedRequests });

        // 실제로 방에 참여자로 추가
        get().joinRoom(req.roomId, req.userId, req.userName);
      },
      rejectJoinRequest: (requestId) => {
        const updatedRequests = get().joinRequests.map((r) =>
          r.requestId === requestId ? { ...r, status: 'rejected' as const } : r
        );
        set({ joinRequests: updatedRequests });
      },
      inviteUser: (roomId, inviteeId, inviteeName, roomTitle, hostName) => {
        const newInvitation: Invitation = {
          inviteId: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          roomId,
          roomTitle,
          hostName,
          inviteeId,
          inviteeName,
          status: 'pending',
        };
        set((state) => ({
          invitations: [newInvitation, ...state.invitations],
        }));
      },
      acceptInvitation: (inviteId) => {
        const inv = get().invitations.find((i) => i.inviteId === inviteId);
        if (!inv) return;

        const updatedInvitations = get().invitations.map((i) =>
          i.inviteId === inviteId ? { ...i, status: 'accepted' as const } : i
        );

        set({ invitations: updatedInvitations });

        // 방 입장 처리
        get().joinRoom(inv.roomId, inv.inviteeId, inv.inviteeName);
      },
      declineInvitation: (inviteId) => {
        const updatedInvitations = get().invitations.map((i) =>
          i.inviteId === inviteId ? { ...i, status: 'declined' as const } : i
        );
        set({ invitations: updatedInvitations });
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
            // 내 활성 룸 데이터 업데이트 및 룸 목록 동기화
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
