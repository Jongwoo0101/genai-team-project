import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMessageStore } from '../stores/useMessageStore';
import { getRooms } from '../api';
import { MessageSidebar } from './MessageSidebar';
import { MessageRoom } from './MessageRoom';
import type { ChatRoom } from '../types';

export const MessagePage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { setRooms, setActiveRoomId } = useMessageStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;

    const loadRooms = async () => {
      try {
        setLoading(true);
        const data = await getRooms(teamId);
        setRooms(data);
        if (data.length > 0) {
          setActiveRoomId(data[0].roomId);
        }
      } catch (err) {
        console.warn('백엔드 API 호출 실패. 화면 데모를 위해 모의 데이터를 로드합니다.', err);
        
        // 데모용 모의 데이터 로드
        const mockRooms: ChatRoom[] = [
          {
            roomId: 'room-team-1',
            roomName: `${teamId}팀 전체 채널`,
            type: 'TEAM',
            members: [],
            unreadCount: 0,
          },
          {
            roomId: 'room-dm-1',
            roomName: '김철수',
            type: 'DM',
            members: [
              {
                id: 'user-chulsoo',
                name: '김철수',
                status: 'MEETING',
              },
            ],
            unreadCount: 2,
          },
          {
            roomId: 'room-dm-2',
            roomName: '이영희',
            type: 'DM',
            members: [
              {
                id: 'user-younghee',
                name: '이영희',
                status: 'WORKING',
              },
            ],
            unreadCount: 0,
          },
          {
            roomId: 'room-dm-3',
            roomName: '박민수',
            type: 'DM',
            members: [
              {
                id: 'user-minsoo',
                name: '박민수',
                status: 'RESTING',
              },
            ],
            unreadCount: 0,
          },
        ];
        
        setRooms(mockRooms);
        if (mockRooms.length > 0) {
          setActiveRoomId(mockRooms[0].roomId);
        }
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, [teamId, setRooms, setActiveRoomId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400">
        메시지 채널 정보를 로드 중입니다...
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-slate-950">
      <MessageSidebar />
      <MessageRoom />
    </div>
  );
};
