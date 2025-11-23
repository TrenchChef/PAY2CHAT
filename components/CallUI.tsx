'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCallStore } from '@/lib/store/useCallStore';
import { useRoomStore } from '@/lib/store/useRoomStore';
import { TipModal } from './TipModal';
import { FilePurchaseModal } from './FilePurchaseModal';
import { Spinner } from './Spinner';
import { formatTime } from '@/lib/utils/time';

export function CallUI() {
  const router = useRouter();
  const { currentRoom, isHost } = useRoomStore();
  const {
    localStream,
    remoteStream,
    connectionState,
    elapsedTime,
    nextPaymentCountdown,
    setLocalStream,
    setRemoteStream,
    setConnectionState,
    updateTimer,
    endCall,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [endingCall, setEndingCall] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!currentRoom) return;

    // Initialize WebRTC connection
    const initCall = async () => {
      try {
        const { WebRTCClient } = await import('@/lib/webrtc/client');
        const client = new WebRTCClient({
          roomId: currentRoom.id,
          isHost,
          signalingUrl: process.env.NEXT_PUBLIC_SIGNALING_URL || 'ws://localhost:3001',
        });

        await client.initialize();
        const stream = client.getLocalStream();
        if (stream) {
          setLocalStream(stream);
        }

        if (isHost) {
          await client.createOffer();
        }

        // Store client for cleanup
        (window as any).__webrtcClient = client;
      } catch (err) {
        console.error('Failed to initialize call:', err);
        setConnectionState('failed');
      }
    };

    initCall();

    return () => {
      if ((window as any).__webrtcClient) {
        (window as any).__webrtcClient.cleanup();
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [currentRoom, isHost]);

  const handleEndCall = () => {
    if (endingCall) return;
    setEndingCall(true);
    endCall();
    if (isHost) {
      router.push(`/room/${currentRoom?.id}/host/post-call`);
    } else {
      router.push(`/room/${currentRoom?.id}/invitee/post-call`);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = audioMuted;
      });
      setAudioMuted(!audioMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = videoOff;
      });
      setVideoOff(!videoOff);
    }
  };

  const getCountdownColor = () => {
    if (nextPaymentCountdown > 30) return 'text-secondary';
    if (nextPaymentCountdown > 10) return 'text-accent';
    return 'text-danger';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Local Video */}
        <div className="relative bg-surface rounded-lg overflow-hidden border border-border">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ WebkitPlaysinline: true } as React.CSSProperties}
          />
          <div className="absolute top-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
            You {audioMuted && '🔇'} {videoOff && '📷'}
          </div>
        </div>

        {/* Remote Video */}
        <div className="relative bg-surface rounded-lg overflow-hidden border border-border">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              style={{ WebkitPlaysinline: true } as React.CSSProperties}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted">
              {connectionState === 'connecting' ? 'Connecting...' : 'Waiting for peer...'}
            </div>
          )}
          <div className="absolute top-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
            {isHost ? 'Invitee' : 'Host'}
          </div>
        </div>
      </div>

      {/* Timer and Controls */}
      <div className="bg-surface border-t border-border p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-2xl font-bold">
                {formatTime(elapsedTime)}
              </div>
              <div className={`text-sm ${getCountdownColor()}`}>
                Next payment: {formatTime(nextPaymentCountdown)}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={toggleMute}
                className="px-4 py-2 bg-surface-light hover:bg-surface-light/80 rounded-lg text-sm md:text-base"
              >
                {audioMuted ? '🔇 Unmute' : '🔊 Mute'}
              </button>
              <button
                onClick={toggleVideo}
                className="px-4 py-2 bg-surface-light hover:bg-surface-light/80 rounded-lg text-sm md:text-base"
              >
                {videoOff ? '📷 Camera On' : '📷 Camera Off'}
              </button>
              {!isHost && (
                <>
                  <button
                    onClick={() => setShowTipModal(true)}
                    className="px-4 py-2 bg-accent hover:bg-accent/80 rounded-lg"
                  >
                    💰 Tip
                  </button>
                  <button
                    onClick={() => setShowFileModal(true)}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg"
                  >
                    📁 Files
                  </button>
                </>
              )}
              <button
                onClick={handleEndCall}
                disabled={endingCall}
                className="px-4 py-2 bg-danger hover:bg-danger/80 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {endingCall ? (
                  <>
                    <Spinner size="sm" />
                    <span>Ending...</span>
                  </>
                ) : (
                  'End Call'
                )}
              </button>
            </div>
          </div>

          {isHost && (
            <div className="text-sm text-text-muted">
              <p>Host Controls: You can kick users, see tips, and view file purchases</p>
            </div>
          )}
        </div>
      </div>

      {showTipModal && (
        <TipModal
          onClose={() => setShowTipModal(false)}
          hostWallet={currentRoom?.hostWallet}
        />
      )}

      {showFileModal && currentRoom && (
        <FilePurchaseModal
          onClose={() => setShowFileModal(false)}
          files={currentRoom.config.files.filter(
            (f) => f.purchasableDuringCall
          )}
          hostWallet={currentRoom.hostWallet}
        />
      )}
    </div>
  );
}

