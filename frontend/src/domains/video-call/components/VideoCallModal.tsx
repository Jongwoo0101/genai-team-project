import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useVideoCallStore } from '../stores/videoCallStore';
import { useAuthStore } from '../../auth/stores/authStore';
import { useTeamStore } from '../../team/stores/teamStore';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Users, MonitorUp, Plus } from 'lucide-react';

interface VideoCallModalProps {
  onClose: () => void;
}

export default function VideoCallModal({ onClose }: VideoCallModalProps) {
  const { user } = useAuthStore();
  const { getEmployeeTeam } = useTeamStore();
  const { 
    activeRoom, 
    leaveRoom, 
    toggleCam, 
    toggleMic, 
    joinRequests, 
    invitations, 
    approveJoinRequest, 
    rejectJoinRequest, 
    inviteUser 
  } = useVideoCallStore();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const mySession = activeRoom?.participants.find((p) => p.id === user?.id);
  const team = user?.id ? getEmployeeTeam(user.id) : undefined;

  const pendingRequests = joinRequests.filter(
    (r) => r.roomId === activeRoom?.roomId && r.status === 'pending'
  );

  const inviteableMembers = (team?.members || []).filter(
    (member) =>
      member.id !== user?.id &&
      !activeRoom?.participants.some((p) => p.id === member.id)
  );

  // Camera/mic stream only (screen share is untouched)
  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Everything (used only on unmount / leave)
  const stopAllMedia = () => {
    stopMediaTracks();
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      screenStreamRef.current = screenStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = screenStream;
      }

      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }
      setIsScreenSharing(true);
    } catch (err) {
      console.error('화면 공유 획득 실패:', err);
      setIsScreenSharing(false);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    if (videoRef.current && streamRef.current && mySession?.isCamOn) {
      videoRef.current.srcObject = streamRef.current;
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Effect 1: 방 입장 시 미디어 스트림 획득 (방이 바뀔 때만 실행)
  useEffect(() => {
    const acquireStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        streamRef.current = stream;
        if (videoRef.current && !isScreenSharing) {
          videoRef.current.srcObject = stream;
        }
        setCameraError(null);
      } catch (err) {
        console.error('카메라/마이크 권한 획득 실패:', err);
        setCameraError('미디어 장치(카메라/마이크)에 액세스할 수 없습니다. 권한을 확인해 주세요.');
      }
    };

    if (activeRoom && mySession) {
      void acquireStream();
    }

    return () => {
      // 방에서 나갈 때만 전체 정리
      stopAllMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom?.roomId]);

  // Effect 2: 카메라/마이크 토글 시 트랙 enabled만 조작 (스트림 재획득 없음)
  useEffect(() => {
    if (!streamRef.current) return;

    const wantsCam = !!mySession?.isCamOn;
    const wantsMic = !!mySession?.isMicOn;

    streamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = wantsCam;
    });
    streamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = wantsMic;
    });

    // 화면 공유 중이 아닐 때만 비디오 엘리먼트 업데이트
    if (videoRef.current && !isScreenSharing) {
      if (!wantsCam) {
        videoRef.current.srcObject = null;
      } else if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
    }
  }, [mySession?.isCamOn, mySession?.isMicOn, isScreenSharing]);

  const handleLeave = () => {
    if (activeRoom) {
      leaveRoom(activeRoom.roomId);
    }
    stopScreenShare();
    stopAllMedia();
    onClose();
  };

  const handleToggleCam = () => {
    if (user?.id) {
      toggleCam(user.id);
    }
  };

  const handleToggleMic = () => {
    if (user?.id) {
      toggleMic(user.id);
    }
  };

  if (!activeRoom || !mySession) return null;

  // 참여자 수에 따른 그리드 클래스 연산
  const participantCount = activeRoom.participants.length;
  let gridClass = 'grid-cols-1';
  if (participantCount === 2) gridClass = 'grid-cols-1 md:grid-cols-2';
  else if (participantCount > 2) gridClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const modalRoot = document.getElementById('modal-root');
  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-6">
      {/* 상단 바 */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">{activeRoom.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">개설자: {activeRoom.hostName} • 개설 시각: {activeRoom.createdAt}</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-slate-300 text-sm font-semibold">
          <Users className="w-4 h-4 text-cyan-400" />
          <span>{participantCount}명 참여 중</span>
        </div>
      </div>

      {/* 비디오 스트림 및 사이드 제어 패널 영역 */}
      <div className="flex-1 my-6 overflow-hidden flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex items-center justify-center">
          <div className={`grid ${gridClass} gap-6 w-full max-w-7xl h-full items-center justify-center content-center`}>
            {activeRoom.participants.map((p) => {
              const isMe = p.id === user?.id;

              return (
                <div
                  key={p.id}
                  className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/60 aspect-video flex flex-col items-center justify-center shadow-xl group transition-all duration-300"
                >
                  {/* 1. 내 스트림 카메라 렌더링 */}
                  {isMe ? (
                    p.isCamOn ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover rounded-2xl transform scale-x-[-1]"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center text-white text-xl font-bold">
                        {p.name.charAt(0)}
                      </div>
                    )
                  ) : (
                    /* 2. Mock 및 타인 스트림 가상 렌더링 */
                    p.isCamOn ? (
                      <div className="relative w-full h-full bg-slate-850 flex items-center justify-center">
                        {/* 가상 스트림 플레이스홀더 (움직이는 그라데이션) */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950/20 opacity-70 animate-pulse" />
                        <div className="z-10 flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg">
                            {p.name.charAt(0)}
                          </div>
                          <span className="text-xs text-slate-400 font-medium">카메라 활성화됨 (화면 전송 중)</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-slate-850 border border-slate-700/60 flex items-center justify-center text-slate-400 text-xl font-bold">
                        {p.name.charAt(0)}
                      </div>
                    )
                  )}

                  {/* 상태 인디케이터 (마이크/비디오 상태 뱃지) */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20">
                    <span className="px-3 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md text-xs font-bold text-white border border-white/5">
                      {p.name} {isMe && '(나)'}
                    </span>
                    <div className="flex gap-1.5">
                      <span className={`p-1.5 rounded-lg backdrop-blur-md text-white border ${
                        p.isMicOn ? 'bg-slate-950/80 border-white/5' : 'bg-red-500/20 border-red-500/30'
                      }`}>
                        {p.isMicOn ? <Mic className="w-3.5 h-3.5 text-slate-300" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                      </span>
                      <span className={`p-1.5 rounded-lg backdrop-blur-md text-white border ${
                        p.isCamOn ? 'bg-slate-950/80 border-white/5' : 'bg-red-500/20 border-red-500/30'
                      }`}>
                        {p.isCamOn ? <VideoIcon className="w-3.5 h-3.5 text-slate-300" /> : <VideoOff className="w-3.5 h-3.5 text-red-400" />}
                      </span>
                    </div>
                  </div>

                  {cameraError && isMe && p.isCamOn && (
                    <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center p-4 text-center z-30">
                      <p className="text-xs text-red-400 font-semibold leading-relaxed">{cameraError}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 제어 사이드바 (요청 승인 및 초대 발송) */}
        <div className="w-full lg:w-80 bg-slate-900/60 border border-slate-800/85 rounded-2xl p-5 flex flex-col gap-6 overflow-y-auto backdrop-blur-md">
          {/* 호스트 전용: 참가 요청 승인 */}
          {activeRoom.hostId === user?.id && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                참가 대기 요청 ({pendingRequests.length})
              </h3>
              {pendingRequests.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-2">대기 중인 요청이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div key={req.requestId} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-850">
                      <span className="text-xs font-semibold text-slate-200">{req.userName}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => approveJoinRequest(activeRoom.roomId, req.requestId)}
                          className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold transition-all duration-200 cursor-pointer"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => rejectJoinRequest(activeRoom.roomId, req.requestId)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold border border-slate-700 transition-all duration-200 cursor-pointer"
                        >
                          거절
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 팀원 초대 패널 */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              팀원 초대하기
            </h3>
            {inviteableMembers.length === 0 ? (
              <p className="text-xs text-slate-600 italic py-2">초대 가능한 팀원이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {inviteableMembers.map((member) => {
                  const isInvited = invitations.some(
                    (i) => i.roomId === activeRoom.roomId && i.inviteeId === member.id && i.status === 'pending'
                  );
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-850">
                      <span className="text-xs font-semibold text-slate-200">{member.username}</span>
                      <button
                        disabled={isInvited}
                        onClick={() => inviteUser(activeRoom.roomId, member.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                          isInvited
                            ? 'bg-slate-800 text-slate-600 border border-slate-750'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        {isInvited ? '초대됨' : '초대'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 제어 바 */}
      <div className="border-t border-slate-850/80 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* 설명 영역 */}
        <div className="hidden md:block">
          <p className="text-xs text-slate-500">마이크 및 카메라 토글 시 다른 팀원들에게 실시간으로 내 방송 상태가 동기화됩니다.</p>
        </div>

        {/* 제어 버튼 그룹 */}
        <div className="flex items-center gap-4">
          {/* 마이크 토글 */}
          <button
            onClick={handleToggleMic}
            className={`p-4 rounded-full border transition-all duration-200 cursor-pointer ${
              mySession.isMicOn
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
            }`}
            title={mySession.isMicOn ? '마이크 음소거' : '마이크 켜기'}
          >
            {mySession.isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* 카메라 토글 */}
          <button
            onClick={handleToggleCam}
            className={`p-4 rounded-full border transition-all duration-200 cursor-pointer ${
              mySession.isCamOn
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
            }`}
            title={mySession.isCamOn ? '카메라 끄기' : '카메라 켜기'}
          >
            {mySession.isCamOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* 실제 화면 공유 */}
          <button
            onClick={() => {
              if (isScreenSharing) {
                stopScreenShare();
              } else {
                void startScreenShare();
              }
            }}
            className={`p-4 rounded-full border transition-all duration-200 cursor-pointer ${
              isScreenSharing
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title={isScreenSharing ? '화면 공유 중지' : '화면 공유 시작'}
          >
            <MonitorUp className="w-5 h-5" />
          </button>

          {/* 통화 나가기 */}
          <button
            onClick={handleLeave}
            className="p-4 rounded-full bg-red-600 border border-red-500 text-white hover:bg-red-500 transition-all duration-200 shadow-lg shadow-red-600/10 cursor-pointer"
            title="통화 종료"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        {/* 빈 공간 보정 */}
        <div className="w-24 hidden md:block"></div>
      </div>
    </div>
  );

  return modalRoot ? createPortal(modalContent, modalRoot) : modalContent;
}
