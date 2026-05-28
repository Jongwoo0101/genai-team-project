import React from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import type { ChatRoom } from '../types';
import { UrgentAlertButton } from './UrgentAlertButton';
import { BellOff } from 'lucide-react';

interface Props {
  room?: ChatRoom;
}

export const StatusAlertBanner: React.FC<Props> = ({ room }) => {
  const { receiverStatusMap } = useMessageStore();

  if (!room || room.type !== 'DM') return null;

  const receiver = room.members[0];
  const currentStatus = receiver ? (receiverStatusMap[receiver.id] || receiver.status) : 'OFFLINE';

  if (currentStatus !== 'MEETING' && currentStatus !== 'RESTING') return null;

  const statusKorean = currentStatus === 'MEETING' ? '회의 중' : '휴식 중';

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-400 shrink-0">
      <div className="flex items-center gap-2">
        <BellOff className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          현재 <strong className="text-slate-100 font-bold">{receiver?.name}</strong>님은 <strong>{statusKorean}</strong> 상태입니다. 메시지 알림이 울리지 않습니다.
        </span>
      </div>
      <UrgentAlertButton receiverId={receiver?.id} />
    </div>
  );
};
