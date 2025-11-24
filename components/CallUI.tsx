/**
 * Stage 2: Basic Call UI
 * 
 * Minimal UI around the call:
 * - Local video, remote video
 * - Mute
 * - Camera toggle
 * - End call
 * - Connection state indicator
 * 
 * NO payment logic, NO wallet logic, NO timers, NO billing
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { WebRTCClient, ConnectionState } from '@/lib/webrtc/client';
import { useCallStore } from '@/lib/store/useCallStore';

export function CallUI() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.id as string;
  const [isHost, setIsHost] = useState(false);

  const {
    localStream,
    remoteStream,
    connectionState,
    setLocalStream,
    setRemoteStream,
    setConnectionState,
    endCall,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcClientRef = useRef<WebRTCClient | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  // Determine if host based on URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsHost(window.location.pathname.includes('/host'));
    }
  }, []);

  // Initialize WebRTC client
  useEffect(() => {
    if (!roomId) return;

    // Get signaling URL from environment or use default
    const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL || 'ws://localhost:8888';

    const client = new WebRTCClient({
      roomId,
      isHost,
      signalingUrl,
      onConnectionStateChange: (state) => {
        setConnectionState(state);
      },
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
      },
      onDataChannelMessage: (message) => {
        console.log('Data channel message:', message);
      },
    });

    webrtcClientRef.current = client;

    // Initialize and get user media
    client
      .initialize()
      .then(() => {
        const stream = client.getLocalStream();
        if (stream) {
          setLocalStream(stream);
        }

        // Host creates offer automatically when signaling connects
        if (isHost) {
          // Offer will be created when peer joins via signaling
        }
      })
      .catch((error) => {
        console.error('Failed to initialize WebRTC:', error);
      });

    return () => {
      client.cleanup();
      endCall();
    };
  }, [roomId, isHost, setLocalStream, setRemoteStream, setConnectionState, endCall]);

  // Update video elements when streams change
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

  // Toggle audio mute
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = audioMuted;
      });
      setAudioMuted(!audioMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = videoOff;
      });
      setVideoOff(!videoOff);
    }
  };

  // End call
  const handleEndCall = () => {
    webrtcClientRef.current?.cleanup();
    endCall();
    router.push('/');
  };

  // Get connection state color
  const getConnectionStateColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-secondary';
      case 'connecting':
        return 'text-accent';
      case 'failed':
        return 'text-danger';
      default:
        return 'text-text-muted';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-surface border-b border-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text">Video Call</h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionState === 'connected' ? 'bg-secondary' :
              connectionState === 'connecting' ? 'bg-accent' :
              connectionState === 'failed' ? 'bg-danger' : 'bg-text-muted'
            }`} />
            <span className={`text-sm font-medium ${getConnectionStateColor()}`}>
              {connectionState.charAt(0).toUpperCase() + connectionState.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-6xl">
          {/* Local Video */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
              You {isHost ? '(Host)' : '(Invitee)'}
            </div>
            {videoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface">
                <span className="text-text-muted">Video Off</span>
              </div>
            )}
          </div>

          {/* Remote Video */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-surface">
                <span className="text-text-muted">
                  {connectionState === 'connecting' ? 'Connecting...' : 'Waiting for remote video...'}
                </span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
              {isHost ? 'Invitee' : 'Host'}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-surface border-t border-border p-4">
        <div className="container mx-auto flex items-center justify-center gap-4">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              audioMuted
                ? 'bg-danger hover:bg-red-600 text-white'
                : 'bg-surface-light hover:bg-surface-light/80 text-text'
            }`}
            aria-label={audioMuted ? 'Unmute' : 'Mute'}
          >
            {audioMuted ? '🔇 Unmute' : '🎤 Mute'}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={toggleVideo}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              videoOff
                ? 'bg-danger hover:bg-red-600 text-white'
                : 'bg-surface-light hover:bg-surface-light/80 text-text'
            }`}
            aria-label={videoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {videoOff ? '📷 Turn On Camera' : '📹 Turn Off Camera'}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="px-6 py-3 bg-danger hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
            aria-label="End call"
          >
            End Call
          </button>
        </div>
      </div>
    </div>
  );
}
