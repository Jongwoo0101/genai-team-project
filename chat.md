# 메세지 기능 프론트엔드 구현 계획 (Message Feature)

본 계획은 기획서 5번 항목인 '메세지 기능(수신자 상태 기반 알림 및 긴급 알림)'의 프론트엔드 React 컴포넌트 분리 및 상태 관리 전략을 정의합니다. 백엔드 구현은 별도 진행되므로, 프론트엔드에서 필요한 API/웹소켓 인터페이스 명세도 함께 정의합니다.

> [!NOTE]
> 프로젝트의 기존 Domain-Driven Design(DDD) 구조에 맞춰 `src/domains/messaging` 도메인을 신규 생성하여 응집도를 높입니다.

## 1. 디렉토리 및 컴포넌트 구조 계획 (`src/domains/messaging`)

```text
src/domains/messaging/
├── components/
│   ├── MessageRoom.tsx            # 채팅방 최상위 컨테이너 (Layout)
│   ├── MessageHeader.tsx          # 수신자 정보 및 현재 상태 표시 영역
│   ├── MessageList.tsx            # 메시지 내역 리스트 렌더링
│   ├── MessageBubble.tsx          # 개별 메시지 말풍선 컴포넌트
│   ├── MessageInput.tsx           # 메시지 입력창 및 전송 버튼
│   ├── StatusAlertBanner.tsx      # 수신자 부재/회의 중 안내 배너 ("현재 OOO님은 회의 중입니다...")
│   └── UrgentAlertButton.tsx      # 긴급 알림 전송 버튼
├── hooks/
│   ├── useMessageWebSocket.ts     # 실시간 메시지 및 상태 업데이트 처리를 위한 웹소켓 훅
│   └── useReceiverStatus.ts       # 상대방의 실시간 상태를 구독하는 훅
├── stores/
│   └── useMessageStore.ts         # 채팅 내역, 수신자 상태, 입력 텍스트 등을 관리하는 전역/로컬 상태 (Zustand)
└── types/
    └── index.ts                   # Message, UserStatus, UrgentPayload 등 타입 정의
```

## 2. 파일별 세부 구현 명세 및 코드 구조 (Carousel 가이드)

메시지 도메인을 구성하는 각 파일의 세부 역할과 코드 구조(뼈대)를 여러 페이지에 걸쳐 상세히 나타냅니다.

````carousel
### Page 1: types/index.ts (타입 정의)

채팅방 정보, 메시지 형식, 실시간 상태값 등을 관리하는 공통 TypeScript 인터페이스 정의 파일입니다.

```typescript
// src/domains/messaging/types/index.ts

export type UserStatus = 'WORKING' | 'MEETING' | 'RESTING' | 'OFFLINE';

export interface ChatUser {
  id: string;
  name: string;
  avatarUrl?: string;
  status: UserStatus;
}

export interface Message {
  messageId: string;
  roomId: string;
  senderId: string;
  content: string;
  isUrgent: boolean;
  createdAt: string;
}

export interface ChatRoom {
  roomId: string;
  roomName: string;
  type: 'TEAM' | 'DM';
  members: ChatUser[];
  unreadCount: number;
}
```
<!-- slide -->
### Page 2: stores/useMessageStore.ts (Zustand 상태 관리)

채팅방 목록, 활성화된 채팅방 상태, 실시간 동기화 상태 등을 관리하는 중앙 저장소입니다.

```typescript
// src/domains/messaging/stores/useMessageStore.ts
import { create } from 'zustand';
import { ChatRoom, Message, ChatUser, UserStatus } from '../types';

interface MessageState {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  messages: Message[];
  receiverStatusMap: Record<string, UserStatus>;
  
  setRooms: (rooms: ChatRoom[]) => void;
  setActiveRoomId: (roomId: string) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateUserStatus: (userId: string, status: UserStatus) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  rooms: [],
  activeRoomId: null,
  messages: [],
  receiverStatusMap: {},
  
  setRooms: (rooms) => set({ rooms }),
  setActiveRoomId: (activeRoomId) => set({ activeRoomId, messages: [] }), // 방 이동 시 메시지 초기화 후 페칭
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateUserStatus: (userId, status) => set((state) => ({
    receiverStatusMap: { ...state.receiverStatusMap, [userId]: status }
  })),
}));
```
<!-- slide -->
### Page 3: hooks/useMessageWebSocket.ts (웹소켓 실시간 구독)

STOMP/WebSocket 클라이언트를 연결하고, 메시지 및 상대방의 상태 변화를 실시간으로 받아와 Zustand Store에 동기화합니다.

```typescript
// src/domains/messaging/hooks/useMessageWebSocket.ts
import { useEffect, useRef } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { client } from '@/lib/websocket'; // 기존 웹소켓 클라이언트 모듈 가정

export const useMessageWebSocket = (roomId: string | null) => {
  const { addMessage, updateUserStatus } = useMessageStore();

  useEffect(() => {
    if (!roomId) return;

    // 1. 실시간 메시지 수신 구독
    const messageSub = client.subscribe(`/topic/messages/${roomId}`, (message) => {
      const parsedMessage = JSON.parse(message.body);
      addMessage(parsedMessage);
    });

    // 2. 실시간 상태 변경 구독
    const statusSub = client.subscribe(`/topic/status`, (statusUpdate) => {
      const { userId, status } = JSON.parse(statusUpdate.body);
      updateUserStatus(userId, status);
    });

    return () => {
      messageSub.unsubscribe();
      statusSub.unsubscribe();
    };
  }, [roomId, addMessage, updateUserStatus]);
};
```
<!-- slide -->
### Page 4: components/MessageSidebar.tsx (좌측 채널 및 멤버 목록)

현재 속한 팀의 공용 메시지방 및 팀원들의 DM 목록을 렌더링하고 실시간 상태를 노출합니다.

```tsx
// src/domains/messaging/components/MessageSidebar.tsx
import React from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { ChatRoom } from '../types';

export const MessageSidebar: React.FC = () => {
  const { rooms, activeRoomId, setActiveRoomId, receiverStatusMap } = useMessageStore();

  return (
    <aside className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 font-bold text-slate-100">메시지 채널</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* 팀 메시지 */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 px-2 mb-1">팀 채널</h4>
          {rooms.filter(r => r.type === 'TEAM').map(room => (
            <button 
              key={room.roomId}
              onClick={() => setActiveRoomId(room.roomId)}
              className={`w-full text-left p-2 rounded-lg text-sm transition ${activeRoomId === room.roomId ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              # {room.roomName}
            </button>
          ))}
        </div>

        {/* 1:1 개인 메시지 */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 px-2 mb-1">개인 메시지 (DM)</h4>
          {rooms.filter(r => r.type === 'DM').map(room => {
            const receiver = room.members[0]; // 상대방
            const currentStatus = receiverStatusMap[receiver?.id] || receiver?.status;
            return (
              <button 
                key={room.roomId}
                onClick={() => setActiveRoomId(room.roomId)}
                className={`w-full text-left p-2 rounded-lg text-sm flex items-center justify-between transition ${activeRoomId === room.roomId ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <span>{receiver?.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  currentStatus === 'WORKING' ? 'bg-emerald-500/10 text-emerald-400' :
                  currentStatus === 'MEETING' ? 'bg-amber-500/10 text-amber-400' :
                  currentStatus === 'RESTING' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-700/10 text-slate-400'
                }`}>
                  {currentStatus}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
```
<!-- slide -->
### Page 5: components/MessageRoom.tsx (우측 채팅 화면 컨테이너)

선택된 채팅방의 헤더, 메시지 목록, 입력 바, 상태 알림 배너를 모아서 레이아웃을 형성합니다.

```tsx
// src/domains/messaging/components/MessageRoom.tsx
import React, { useEffect } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { useMessageWebSocket } from '../hooks/useMessageWebSocket';
import { MessageHeader } from './MessageHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { StatusAlertBanner } from './StatusAlertBanner';

export const MessageRoom: React.FC = () => {
  const { activeRoomId, rooms } = useMessageStore();
  useMessageWebSocket(activeRoomId);

  if (!activeRoomId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400">
        메시지를 보낼 대상을 선택해 주세요.
      </div>
    );
  }

  const currentRoom = rooms.find(r => r.roomId === activeRoomId);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950">
      <MessageHeader room={currentRoom} />
      <StatusAlertBanner room={currentRoom} />
      <div className="flex-1 overflow-hidden relative">
        <MessageList />
      </div>
      <MessageInput roomId={activeRoomId} />
    </div>
  );
};
```
<!-- slide -->
### Page 6: components/StatusAlertBanner.tsx (상태 감지 배너)

상대방이 회의(MEETING) 또는 휴식/자리비움(RESTING) 상태일 때 상단에 비방해 알림 텍스트를 출력합니다.

```tsx
// src/domains/messaging/components/StatusAlertBanner.tsx
import React from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { ChatRoom } from '../types';
import { UrgentAlertButton } from './UrgentAlertButton';

interface Props {
  room?: ChatRoom;
}

export const StatusAlertBanner: React.FC<Props> = ({ room }) => {
  const { receiverStatusMap } = useMessageStore();

  if (!room || room.type !== 'DM') return null;

  const receiver = room.members[0];
  const currentStatus = receiverStatusMap[receiver?.id] || receiver?.status;

  if (currentStatus !== 'MEETING' && currentStatus !== 'RESTING') return null;

  const statusKorean = currentStatus === 'MEETING' ? '회의 중' : '휴식 중';

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-400">
      <span>
        현재 {receiver?.name}님은 <strong>{statusKorean}</strong>입니다. 메시지 알림이 울리지 않습니다.
      </span>
      <UrgentAlertButton receiverId={receiver?.id} />
    </div>
  );
};
```
<!-- slide -->
### Page 7: components/UrgentAlertButton.tsx (긴급 알림 버튼)

배너 내에서 상대방에게 즉시 DirectPing(오버레이 경보) 신호를 강제로 날릴 수 있는 컴포넌트입니다.

```tsx
// src/domains/messaging/components/UrgentAlertButton.tsx
import React from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { client } from '@/lib/websocket';

interface Props {
  receiverId?: string;
}

export const UrgentAlertButton: React.FC<Props> = ({ receiverId }) => {
  const { activeRoomId } = useMessageStore();

  const handleUrgentAlert = () => {
    if (!receiverId || !activeRoomId) return;

    // 기존 DirectPing 시스템 메시지 발행 엔드포인트로 긴급 노출 호출
    client.publish({
      destination: `/app/messages/${activeRoomId}/urgent`,
      body: JSON.stringify({
        receiverId,
        content: "🚨 긴급 알림 메시지입니다. 즉시 확인해 주세요!"
      })
    });
    
    alert('상대방에게 긴급 사이렌 경고를 보냈습니다.');
  };

  return (
    <button 
      onClick={handleUrgentAlert}
      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold transition flex items-center gap-1"
    >
      🚨 긴급 알림 울리기
    </button>
  );
};
```
<!-- slide -->
### Page 8: components/MessageInput.tsx (텍스트 입력 및 `/긴급` 명령어 파싱)

사용자로부터 메시지 입력을 받으며, `/긴급` 명령어로 시작하는 메시지 입력 시 일반 텍스트 전송 대신 긴급 사이렌 알림(DirectPing)과 결합한 전송을 수행합니다.

```tsx
// src/domains/messaging/components/MessageInput.tsx
import React, { useState } from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { client } from '@/lib/websocket';

interface Props {
  roomId: string;
}

export const MessageInput: React.FC<Props> = ({ roomId }) => {
  const [text, setText] = useState('');
  const { rooms } = useMessageStore();

  const handleSend = () => {
    if (!text.trim()) return;

    // 명령어 체크: 메시지가 '/긴급'으로 시작하는 경우
    if (text.startsWith('/긴급')) {
      const content = text.replace('/긴급', '').trim();
      const currentRoom = rooms.find(r => r.roomId === roomId);
      const receiver = currentRoom?.members[0];

      if (currentRoom?.type === 'DM' && receiver) {
        // 1:1 DM 상황에서 긴급 알림 발생
        client.publish({
          destination: `/app/messages/${roomId}/urgent`,
          body: JSON.stringify({
            receiverId: receiver.id,
            content: content || "🚨 긴급 알림 메시지입니다. 즉시 확인해 주세요!"
          })
        });
        alert('상대방에게 긴급 사이렌 경고를 전송했습니다.');
      } else {
        alert('긴급 알림은 1:1 개인 메시지(DM) 공간에서만 보낼 수 있습니다.');
      }
    } else {
      // 일반 메시지 전송
      client.publish({
        destination: `/app/messages/${roomId}`,
        body: JSON.stringify({ content: text, isUrgent: false })
      });
    }

    setText('');
  };

  return (
    <div className="p-4 border-t border-slate-800 bg-slate-900 flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="메시지를 입력하세요... (긴급 알림은 '/긴급 [내용]' 입력)"
        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
      />
      <button 
        onClick={handleSend}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition"
      >
        전송
      </button>
    </div>
  );
};
```
````

## 4. 프론트엔드 - 백엔드 연결 인터페이스(API/WebSocket) 명세서

프론트엔드와 백엔드 간의 원활한 연결을 위해 다음 명세에 맞추어 API 및 WebSocket 엔드포인트 구현을 요청합니다.

### 4.1 WebSocket 통신 명세 (실시간 처리용)

웹소켓은 사용자의 상태 변경 감지와 실시간 메시지 수발신을 담당합니다.
**Endpoint:** `ws://{api-server}/ws/messaging`

#### [Client -> Server] 메시지 전송 이벤트
```json
{
  "type": "SEND_MESSAGE",
  "payload": {
    "roomId": "string",
    "content": "string",
    "isUrgent": "boolean" // 긴급 알림 여부
  }
}
```

#### [Server -> Client] 새로운 메시지 수신 이벤트
```json
{
  "type": "RECEIVE_MESSAGE",
  "payload": {
    "messageId": "string",
    "roomId": "string",
    "senderId": "string",
    "content": "string",
    "isUrgent": "boolean",
    "createdAt": "ISO 8601 string"
  }
}
```

#### [Server -> Client] 상대방 상태 변경 알림 이벤트
```json
{
  "type": "USER_STATUS_UPDATE",
  "payload": {
    "userId": "string",
    "status": "WORKING" | "MEETING" | "RESTING" // 근무 중, 회의 중, 휴식
  }
}
```

### 4.2 REST API 통신 명세 (데이터 로드용)

#### 1. 이전 채팅 내역 조회
- **Method / Path:** `GET /api/v1/messages/room/{roomId}`
- **Query Params:** 
  - `page` (number): 페이지 번호
  - `size` (number): 페이지 당 메시지 수
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roomId": "string",
    "messages": [
      {
        "messageId": "string",
        "senderId": "string",
        "content": "string",
        "isUrgent": "boolean",
        "createdAt": "ISO 8601 string"
      }
    ],
    "hasNext": "boolean"
  }
}
```

#### 2. 특정 사용자의 현재 상태 조회 (채팅방 최초 입장 시)
- **Method / Path:** `GET /api/v1/users/{userId}/status`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "currentStatus": "WORKING" | "MEETING" | "RESTING"
  }
}
```

## 5. 네비게이션 및 라우팅 (팀 컨텍스트 및 권한)

글로벌 네비게이션 바(GNB) 업데이트와 팀 단위 데이터 격리를 위한 라우팅 및 권한 설정 계획입니다.

### 5.1 상단 네비게이션(GNB)에 '메시지' 탭 추가
- 기존 상단 메뉴("홈", "핵심 솔루션", "작동 원리", "요금제", "팀 관리" 등)에 **"메시지" 탭**을 추가합니다.
- 관리자(Manager) 계정과 일반 직원(Employee) 계정 모두 해당 탭이 노출되며 클릭 시 메시지 페이지로 이동합니다.

### 5.2 라우팅 설계 및 팀별 격리(Isolation)
- **URL 구조**: `/team/{teamId}/messages` (또는 활성화된 팀 ID를 전역 상태/로컬 스토리지에서 관리하여 `/messages` 로 접근하되 내부적으로 분기)
- **팀 데이터 격리**: 메시지 페이지 접속 시, 현재 로그인한 사용자가 **선택한(속한) 특정 팀(예: 팀1)**의 컨텍스트를 파악하여, **해당 팀 내의 메시지 채널/목록만** 필터링하여 보여줍니다.
- 즉, 여러 팀(팀1, 팀2)에 속해 있거나 관리하는 경우, 현재 활성화된 팀(Current Team)의 메시지만 표시되어야 합니다.

### 5.3 채팅 채널 분류 (팀 메시지 & 1:1 개인 메시지)
- **팀 전체 메시지 (Team Channel)**: 해당 팀에 속한 모든 멤버가 공용으로 대화하고 조회할 수 있는 공간입니다.
- **1:1 개인 메시지 (Direct Message - DM)**: 동일 팀 내의 특정 팀원과 1:1로 대화하는 프라이빗 공간입니다.
- **사이드바 UI 추가 (`MessageSidebar.tsx`)**: 
  - 메시지 페이지 좌측에 사이드바를 배치하여 **"팀 전체 메시지 채널"**과 **"팀원 목록(1:1 DM)"**을 보여줍니다.
  - 각 팀원의 이름 옆에 실시간 상태(근무 중, 회의 중, 휴식 등)를 아이콘/텍스트로 직관적으로 표시합니다.
  - 목록에서 특정 팀원이나 팀 채널을 클릭하면 우측의 `MessageRoom` 컴포넌트에 해당 채팅방 대화 내역이 로드됩니다.

### 5.4 계정 권한별 공통 사용
- **관리자(MANAGER)**: 본인이 관리하는 팀의 메시지 페이지 접속 및 사용 가능.
- **직원(EMPLOYEE)**: 본인이 소속된 팀의 메시지 페이지 접속 및 사용 가능.
- 양쪽 권한 모두 동일한 메시지 UI 컴포넌트(`MessageRoom` 등)를 공유하며, 백엔드 요청 시 토큰 및 Team ID를 기반으로 소속 여부를 철저히 검증합니다.

---

## 6. 다중 팀 메시지 보안 및 비정상 접근 제어 (Security)

1팀의 직원이 URL을 임의로 변경하여 2팀의 메시지나 API에 불법적으로 접근하는 것을 방지하기 위해 **프론트엔드 라우터 가드** 및 **백엔드 이중 검증(REST API & WebSocket)**을 설계하고 구현합니다.

### 6.1 백엔드(Spring Boot) 보안 검증 로직

백엔드에서는 HTTP 요청 및 WebSocket 구독 요청 시 사용자의 세션 정보(JWT)와 요청 리소스(채널/팀 ID)를 데이터베이스 수준에서 검증합니다.

#### 1. REST API 검증 (채팅 내역 조회 및 전송 시)
컨트롤러 또는 서비스 레이어에서 로그인한 회원 정보와 조회하고자 하는 방(Room)의 팀 소속을 매핑하여 검증합니다.

```java
// backend/src/main/java/com/worksight/api/service/MessageService.java (가상 구현)

@Service
@RequiredArgsConstructor
public class MessageService {
    private final MessageRoomRepository roomRepository;
    private final MemberRepository memberRepository;

    @Transactional(readOnly = true)
    public List<MessageResponse> getRoomMessages(Long roomId, Member currentMember) {
        MessageRoom room = roomRepository.findById(roomId)
            .orElseThrow(() -> new EntityNotFoundException("방을 찾을 수 없습니다."));

        // 검증: 현재 사용자의 teamId가 방이 속한 teamId와 일치하는지 확인
        if (!currentMember.getManagerId().equals(room.getTeam().getManagerId())) {
            throw new AccessDeniedException("해당 팀의 메시지에 접근할 권한이 없습니다.");
        }

        return messageRepository.findByRoomId(roomId);
    }
}
```

#### 2. WebSocket 구독 검증 (STOMP ChannelInterceptor)
WebSocket 세션이 수립된 후 특정 토픽(`/topic/messages/{roomId}`)을 구독(Subscribe)하려고 시도할 때, 인터셉터를 통해 해당 방의 접근 권한이 있는지 체크하고 거부합니다.

```java
// backend/src/main/java/com/worksight/api/config/WebSocketSecurityInterceptor.java (가상 구현)

@Component
@RequiredArgsConstructor
public class WebSocketSecurityInterceptor implements ChannelInterceptor {
    private final MessageRoomRepository roomRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination(); // 예: /topic/messages/15
            if (destination != null && destination.startsWith("/topic/messages/")) {
                Long roomId = Long.parseLong(destination.replace("/topic/messages/", ""));
                
                // Spring Security Context에서 인증된 유저 획득
                Principal principal = accessor.getUser(); 
                Member member = getMemberFromPrincipal(principal);

                // 검증 수행: 해당 멤버가 방의 팀 멤버가 아닌 경우 예외 발생
                MessageRoom room = roomRepository.findById(roomId).orElse(null);
                if (room == null || !member.getManagerId().equals(room.getTeam().getManagerId())) {
                    throw new MessageDeliveryException("구독 권한이 없습니다.");
                }
            }
        }
        return message;
    }
}
```

### 6.2 프론트엔드(React) 라우터 가드 검증

사용자가 비정상적인 경로(예: URL 직접 주소창 입력 `/team/2/messages`)로 접근 시, 소속 팀 정보를 체크하여 리다이렉트 처리합니다.

```tsx
// frontend/src/components/TeamMessageGuard.tsx (가상 구현)
import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore'; // 예시 로그인 상태 스토어

export const TeamMessageGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuthStore(); // 로그인 유저 정보 (소속된 teamId 목록 포함)

  // 사용자의 소속 팀 ID가 URL 파라미터의 teamId와 일치하지 않는 경우
  const isAuthorized = user?.teamId === Number(teamId) || user?.role === 'ADMIN';

  if (!isAuthorized) {
    alert('해당 팀의 메시지 기능에 접근할 수 없습니다.');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
```

---

## 🙋‍♂️ Open Questions & User Review Required

> [!IMPORTANT]
> 다음 사항들에 대해 프론트엔드 구현 전 확인 및 결정이 필요합니다.

1. **'긴급 알림' UI 위치**: 긴급 알림 버튼을 안내 배너(`StatusAlertBanner`) 안에 버튼 형태로 둘까요, 아니면 메시지 입력창 옆에 🚨(사이렌) 아이콘 형태로 항상/조건부로 노출할까요?
2. **디자인 시스템**: 알림 배너나 채팅 말풍선에 기존에 사용 중인 UI 컴포넌트 라이브러리(예: Tailwind, Radix UI, MUI 등)의 특정 컴포넌트를 활용할까요?

> [!TIP]
> **긴급 알림 방식 결정 완료**: 기존 `ManagerDashboardContent.tsx` 및 `EmployeeViewContent.tsx`에 구현되어 있는 **'DirectPing (상사 긴급 경고)'** 기능의 빨간색 풀스크린 오버레이와 경보음 시스템을 재사용하는 것으로 확정되었습니다.
