import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../auth/stores/authStore';

export const TeamMessageGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuthStore();

  // 사용자의 소속 팀 ID가 URL 파라미터의 teamId와 일치하지 않고, 관리자도 아닌 경우 차단
  const isAuthorized = 
    user && 
    (user.role === 'MANAGER' || 
     String(user.id) === teamId || 
     user.username === teamId);

  if (!isAuthorized) {
    alert('해당 팀의 메시지 기능에 접근할 수 없습니다.');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
