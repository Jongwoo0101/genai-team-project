import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../domains/auth/stores/authStore';
import { useCommuteStore } from '../../domains/commute/stores/commuteStore';
import MeetingRoomPanel from './MeetingRoomPanel';

export default function MeetingRoomPage() {
  const { user, isAuthenticated } = useAuthStore();
  const commuteStatus = useCommuteStore((s) => s.commuteStatus);

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  return (
    <main className="min-h-screen bg-slate-950 pt-6 pb-12 px-6">
      <div className="max-w-screen-xl mx-auto">
        <MeetingRoomPanel user={user} commuteStatus={commuteStatus} requireWorkStatus={user.role === 'EMPLOYEE'} />
      </div>
    </main>
  );
}
