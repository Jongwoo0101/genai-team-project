import VideoCallModal from '../../domains/video-call/components/VideoCallModal';
import type { VideoCallRoom } from '../../domains/video-call/stores/videoCallStore';

interface MeetingRoomModalHostProps {
  activeRoom: VideoCallRoom | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MeetingRoomModalHost({ activeRoom, isOpen, onClose }: MeetingRoomModalHostProps) {
  if (!isOpen || !activeRoom) return null;
  return <VideoCallModal onClose={onClose} />;
}
