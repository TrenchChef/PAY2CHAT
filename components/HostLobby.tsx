'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useRoomStore, Room } from '@/lib/store/useRoomStore';
import { Spinner } from './Spinner';
import { encodeRoomToUrl } from '@/lib/utils/roomSharing';
import { PublicKey } from '@solana/web3.js';

export function HostLobby() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.id as string;
  const { currentRoom, setRoom, updateRoomConfig } = useRoomStore();
  const [copied, setCopied] = useState<'code' | 'shareable' | null>(null);
  const [startingCall, setStartingCall] = useState(false);
  const [shareableUrl, setShareableUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Load room from localStorage if not in store
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If we already have the room in store and it matches the URL, we're good
    if (currentRoom && currentRoom.id === roomId) {
      setLoading(false);
      return;
    }

    // Try to load from localStorage
    try {
      const rooms = JSON.parse(localStorage.getItem('x402_rooms') || '[]');
      const roomData = rooms.find((r: any) => r.id === roomId);
      
      if (roomData) {
        // Restore room with PublicKey
        const restoredRoom: Room = {
          ...roomData,
          hostWallet: new PublicKey(roomData.hostWallet),
        };
        setRoom(restoredRoom, true);
        setLoading(false);
      } else {
        // Room not found, redirect to home
        console.warn('Room not found in localStorage:', roomId);
        setLoading(false);
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to load room from localStorage:', error);
      setLoading(false);
      router.push('/');
    }
  }, [roomId, currentRoom, setRoom, router]);

  useEffect(() => {
    if (!currentRoom || loading) return;

    // Only generate shareable URL in browser (safety check)
    if (typeof window !== 'undefined') {
      try {
        // Generate shareable URL with encoded room data for cross-device support
        const shareable = encodeRoomToUrl(currentRoom);
        setShareableUrl(shareable);
      } catch (error) {
        console.error('Failed to generate shareable URL:', error);
        // Fallback to standard URL
        setShareableUrl(currentRoom.url);
      }
    }

    // Listen for invitee joining (in production, this would be via WebSocket or polling)
    // For now, we'll navigate to call when user clicks "Start Call" or auto-navigate after delay
  }, [currentRoom, router]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentRoom) return null;

  const copyToClipboard = async (text: string, type: 'code' | 'shareable') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleStartCall = () => {
    if (startingCall) return;
    setStartingCall(true);
    router.push(`/room/${currentRoom.id}/call`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Host Lobby</h1>

      <div className="bg-surface rounded-lg p-6 border border-border space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-2">Shareable Room URL</h2>
          <p className="text-sm text-text-muted mb-2">
            Share this URL to join from any device. Works across mobile and desktop.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareableUrl}
              readOnly
              className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-text font-mono text-sm"
            />
            <button
              onClick={() => copyToClipboard(shareableUrl, 'shareable')}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
            >
              {copied === 'shareable' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Join Code</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={currentRoom.joinCode}
              readOnly
              className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-text font-mono text-2xl text-center font-bold"
            />
            <button
              onClick={() => copyToClipboard(currentRoom.joinCode, 'code')}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
            >
              {copied === 'code' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {currentRoom.config.files.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Files</h2>
            <div className="space-y-2">
              {currentRoom.config.files.map((file) => (
                <div
                  key={file.id}
                  className="bg-background rounded p-3 border border-border flex justify-between items-center"
                >
                  <span>{file.name}</span>
                  <span className="font-bold">{file.price} USDC</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <p className="text-text-muted mb-4">Waiting for invitee to join...</p>
          <button
            onClick={handleStartCall}
            disabled={startingCall}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {startingCall ? (
              <>
                <Spinner size="sm" />
                <span>Starting Call...</span>
              </>
            ) : (
              'Start Call (Test)'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

