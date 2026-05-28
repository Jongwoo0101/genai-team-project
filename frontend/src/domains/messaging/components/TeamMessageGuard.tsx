import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../auth/stores/authStore';
import { useTeamStore } from '../../team/stores/teamStore';

export const TeamMessageGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuthStore();
  const { memberTeamMap } = useTeamStore();

  // 1. 관리자는 모든 팀 메시지에 접근 가능
  // 2. 직원의 경우, 본인의 소속 팀 ID가 URL 파라미터의 teamId와 일치하면 접근 가능
  const isAuthorized = 
    user && 
    (user.role === 'MANAGER' || 
     (user.role === 'EMPLOYEE' && memberTeamMap[user.id] === teamId) ||
     String(user.id) === teamId || 
     user.username === teamId);

  if (!isAuthorized) {
    alert('해당 팀의 메시지 기능에 접근할 수 없습니다.');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
