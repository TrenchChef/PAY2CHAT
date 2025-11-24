'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useCallStore } from '@/lib/store/useCallStore';
import { useRoomStore, Room } from '@/lib/store/useRoomStore';
import { TipModal } from './TipModal';
import { FilePurchaseModal } from './FilePurchaseModal';
import { Spinner } from './Spinner';
import { formatTime } from '@/lib/utils/time';
import { useBilling } from '@/lib/hooks/useBilling';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

// Helper function to safely create a PublicKey with validation
function safeCreatePublicKey(walletAddress: any): PublicKey | null {
  if (!walletAddress) {
    console.error('❌ Wallet address is empty or null');
    return null;
  }

  const addressStr = typeof walletAddress === 'string' ? walletAddress : walletAddress.toString();

  // Basic validation - Solana addresses are base58 encoded and typically 32-44 characters
  if (!addressStr || addressStr.length < 32 || addressStr.length > 44) {
    console.error('❌ Invalid wallet address length:', addressStr?.length);
    return null;
  }

  // Check for valid base58 characters (only alphanumeric, no 0, O, I, l)
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(addressStr)) {
    console.error('❌ Wallet address contains invalid characters (non-base58):', addressStr);
    return null;
  }

  try {
    const publicKey = new PublicKey(addressStr);
    return publicKey;
  } catch (error: any) {
    console.error('❌ Failed to create PublicKey:', error?.message, 'Address:', addressStr);
    return null;
  }
}

export function CallUI() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const roomId = params?.id as string;
  const { currentRoom, isHost, setRoom } = useRoomStore();
  const [roomLoading, setRoomLoading] = useState(true);
  const {
    localStream,
    remoteStream,
    connectionState,
    elapsedTime,
    nextPaymentCountdown,
    billingStatus,
    totalPaid,
    setLocalStream,
    setRemoteStream,
    setConnectionState,
    updateTimer,
    endCall,
  } = useCallStore();

  const { publicKey } = useWallet();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcClientRef = useRef<any>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [endingCall, setEndingCall] = useState(false);

  // Load room from localStorage if not in store
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If we already have the room in store and it matches the URL, we're good
    if (currentRoom && currentRoom.id === roomId) {
      setRoomLoading(false);
      return;
    }

    // Try to load from localStorage
    try {
      const rooms = JSON.parse(localStorage.getItem('x402_rooms') || '[]');
      const roomData = rooms.find((r: any) => r.id === roomId);
      
      if (roomData) {
        // Validate and restore room with PublicKey
        const hostWalletKey = safeCreatePublicKey(roomData.hostWallet);
        if (!hostWalletKey) {
          console.error('❌ Invalid wallet address in room data, redirecting to home');
          setRoomLoading(false);
          router.push('/');
          return;
        }

        const restoredRoom: Room = {
          ...roomData,
          hostWallet: hostWalletKey,
        };
        
        // Validate room structure
        if (!restoredRoom.id || !restoredRoom.joinCode || !restoredRoom.config) {
          console.error('❌ Invalid room structure, redirecting to home');
          setRoomLoading(false);
          router.push('/');
          return;
        }

        // Determine if user is host based on URL path
        const isHostUser = pathname?.includes('/host') || false;
        setRoom(restoredRoom, isHostUser);
        setRoomLoading(false);
      } else {
        // Room not found, redirect to home
        console.warn('Room not found in localStorage:', roomId);
        setRoomLoading(false);
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to load room from localStorage:', error);
      setRoomLoading(false);
      router.push('/');
    }
  }, [roomId, currentRoom, setRoom, router]);

  // Initialize billing (only for invitee)
  useBilling({
    webrtcClient: webrtcClientRef.current,
    enabled: !isHost && !!publicKey && connectionState === 'connected',
  });

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
    if (!currentRoom || roomLoading) return;

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

        // Store client for cleanup and billing
        (window as any).__webrtcClient = client;
        webrtcClientRef.current = client;
        callStartTimeRef.current = Date.now();
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
      webrtcClientRef.current = null;
      callStartTimeRef.current = null;
    };
  }, [currentRoom, isHost]);

  // Timer update effect
  useEffect(() => {
    if (connectionState !== 'connected' || !callStartTimeRef.current) {
      return;
    }

    const timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - callStartTimeRef.current!) / 1000);
      
      // Calculate next payment countdown
      // First payment happens at 180 seconds (3 minutes) after prepay period
      // Subsequent payments every 60 seconds
      const timeSinceStart = elapsed;
      const firstBillingAt = 180; // First billing at 3 minutes (after prepay)
      
      let nextPaymentIn: number;
      if (timeSinceStart < firstBillingAt) {
        nextPaymentIn = firstBillingAt - timeSinceStart;
      } else {
        // Calculate time until next minute mark (after first billing)
        const timeSinceFirstBilling = timeSinceStart - firstBillingAt;
        const minutesSinceFirstBilling = Math.floor(timeSinceFirstBilling / 60);
        const nextMinuteMark = firstBillingAt + (minutesSinceFirstBilling + 1) * 60;
        nextPaymentIn = nextMinuteMark - timeSinceStart;
      }

      updateTimer(elapsed, nextPaymentIn);
    }, 1000); // Update every second

    return () => {
      clearInterval(timerInterval);
    };
  }, [connectionState, updateTimer]);

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
    if (billingStatus === 'frozen' || billingStatus === 'failed') return 'text-danger';
    if (nextPaymentCountdown > 30) return 'text-secondary';
    if (nextPaymentCountdown > 10) return 'text-accent';
    return 'text-danger';
  };

  const getBillingStatusText = () => {
    switch (billingStatus) {
      case 'paid':
        return '✅ Paid';
      case 'pending':
        return '⏳ Processing...';
      case 'failed':
        return '❌ Payment Failed';
      case 'frozen':
        return '❄️ Frozen';
      default:
        return '';
    }
  };

  if (roomLoading || !currentRoom) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

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
              {!isHost && (
                <>
                  <div className="text-xs mt-1">
                    {getBillingStatusText()}
                  </div>
                  {totalPaid > 0 && (
                    <div className="text-xs text-text-muted">
                      Total paid: {totalPaid.toFixed(2)} USDC
                    </div>
                  )}
                </>
              )}
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

