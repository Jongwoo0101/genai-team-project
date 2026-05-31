import React from 'react';
import { useMessageStore } from '../stores/useMessageStore';
import { UrgentAlertButton } from './UrgentAlertButton';
import { BellOff } from 'lucide-react';

export const StatusAlertBanner: React.FC = () => {
  const { bannerInfo } = useMessageStore();

  if (!bannerInfo || !bannerInfo.showBanner) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-400 shrink-0">
      <div className="flex items-center gap-2">
        <BellOff className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          {bannerInfo.bannerMessage || `현재 ${bannerInfo.otherMemberUsername}님은 부재 중입니다. 알림이 울리지 않습니다.`}
        </span>
      </div>
      {bannerInfo.canSendUrgent && (
        <UrgentAlertButton receiverId={bannerInfo.otherMemberId} />
      )}
    </div>
  );
};
