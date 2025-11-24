'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useRoomStore, Room } from '@/lib/store/useRoomStore';
import { Spinner } from './Spinner';
import { encodeRoomToUrl } from '@/lib/utils/roomSharing';
import { PublicKey } from '@solana/web3.js';

export function HostLobby() {
  const [mounted, setMounted] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const router = useRouter();
  const { currentRoom, setRoom } = useRoomStore();
  const [copied, setCopied] = useState<'code' | 'shareable' | null>(null);
  const [startingCall, setStartingCall] = useState(false);
  const [shareableUrl, setShareableUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ensure component is mounted and get room ID safely - delay useParams until mounted
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setMounted(true);
    
    // Get room ID from URL pathname instead of useParams to avoid SSR issues
    try {
      const pathname = window.location.pathname;
      const match = pathname.match(/\/room\/([^/]+)\/host/);
      const id = match ? match[1] : '';
      setRoomId(id);
      console.log('🔍 Room ID from URL:', id);
      
      if (!id) {
        setError('No room ID found in URL');
        setLoading(false);
      }
    } catch (e) {
      console.error('❌ Failed to get room ID:', e);
      setError('Failed to get room ID from URL');
      setLoading(false);
    }
  }, []);

  // Load room - check store first, then localStorage
  useEffect(() => {
    if (!mounted || !roomId) {
      if (mounted && !roomId) {
        console.error('❌ No room ID provided in URL');
        setError('No room ID provided');
        setLoading(false);
      }
      return;
    }

    console.log('🔍 Loading room:', roomId);

    // First check if room is already in store (from same session)
    if (currentRoom && currentRoom.id === roomId) {
      console.log('✅ Room found in Zustand store');
      setLoading(false);
      setError(null);
      return;
    }

    // Try sessionStorage first (most recent room)
    try {
      if (typeof Storage !== 'undefined' && sessionStorage) {
        const sessionRoomStr = sessionStorage.getItem('current_room');
        if (sessionRoomStr) {
          const sessionRoom = JSON.parse(sessionRoomStr);
          if (sessionRoom.id === roomId) {
            console.log('✅ Room found in sessionStorage');
            try {
              const restoredRoom: Room = {
                ...sessionRoom,
                hostWallet: new PublicKey(sessionRoom.hostWallet),
              };
              setRoom(restoredRoom, true);
              setError(null);
              setLoading(false);
              return;
            } catch (pkError: any) {
              console.error('❌ Failed to restore PublicKey from sessionStorage:', pkError);
              // Continue to try localStorage
            }
          } else {
            console.log('⚠️ SessionStorage room ID mismatch:', sessionRoom.id, 'vs', roomId);
          }
        }
      }
    } catch (e: any) {
      console.warn('⚠️ Failed to check sessionStorage:', e.message);
      // Continue to try localStorage
    }

    // Try to load from localStorage
    console.log('🔍 Loading room from localStorage, roomId:', roomId);
    try {
      if (typeof Storage === 'undefined' || !localStorage) {
        throw new Error('localStorage is not available');
      }

      const roomsStr = localStorage.getItem('x402_rooms');
      if (!roomsStr) {
        console.warn('⚠️ No rooms in localStorage');
        setError('Room not found. The room may have expired or was created in a different browser session. Please create a new room.');
        setLoading(false);
        return;
      }

      let rooms: any[];
      try {
        rooms = JSON.parse(roomsStr);
      } catch (parseError) {
        console.error('❌ Failed to parse rooms from localStorage:', parseError);
        setError('Failed to read room data. Storage may be corrupted.');
        setLoading(false);
        return;
      }

      console.log('📦 Found', rooms.length, 'rooms in localStorage');
      
      const roomData = rooms.find((r: any) => r && r.id === roomId);
      
      if (!roomData) {
        console.warn('❌ Room not found. Available IDs:', rooms.map((r: any) => r?.id).filter(Boolean));
        setError(`Room "${roomId}" not found. The room may have expired or was cleared. Please create a new room.`);
        setLoading(false);
        return;
      }

      console.log('✅ Room found, restoring...', roomData);
      
      // Validate room data structure
      if (!roomData.hostWallet) {
        console.error('❌ Room data missing hostWallet');
        setError('Room data is incomplete. Invalid wallet address.');
        setLoading(false);
        return;
      }
      
      // Restore room with PublicKey
      try {
        const restoredRoom: Room = {
          ...roomData,
          hostWallet: new PublicKey(roomData.hostWallet),
        };
        
        // Validate restored room
        if (!restoredRoom.id || !restoredRoom.joinCode || !restoredRoom.config) {
          console.error('❌ Invalid room structure after restoration');
          setError('Room data is incomplete. Please create a new room.');
          setLoading(false);
          return;
        }
        
        setRoom(restoredRoom, true);
        setError(null);
        setLoading(false);
        console.log('✅ Room restored successfully');
      } catch (pkError: any) {
        console.error('❌ Failed to restore PublicKey:', pkError);
        setError(`Failed to restore room data: ${pkError.message || 'Invalid wallet address'}`);
        setLoading(false);
      }
    } catch (error: any) {
      console.error('❌ Failed to load room:', error);
      setError(`Failed to load room from storage: ${error.message || 'Unknown error'}. Please try creating a new room.`);
      setLoading(false);
    }
  }, [roomId, currentRoom?.id, setRoom, mounted]);

  // Debug: Log current state periodically
  useEffect(() => {
    if (mounted && roomId) {
      console.log('📊 HostLobby state:', {
        mounted,
        roomId,
        loading,
        error,
        hasCurrentRoom: !!currentRoom,
        currentRoomId: currentRoom?.id,
      });
    }
  }, [mounted, roomId, loading, error, currentRoom]);

  // Generate shareable URL when room is available
  useEffect(() => {
    if (loading || !currentRoom || typeof window === 'undefined') {
      return;
    }

    // Always set a fallback URL first
    const fallbackUrl = currentRoom?.url || (currentRoom?.id && currentRoom?.joinCode ? `${window.location.origin}/join?room=${currentRoom.id}&code=${currentRoom.joinCode}` : '');
    setShareableUrl(fallbackUrl);

    // Try to generate shareable URL
    try {
      const shareable = encodeRoomToUrl(currentRoom);
      setShareableUrl(shareable);
      console.log('✅ Shareable URL generated');
    } catch (error) {
      console.warn('⚠️ Failed to generate shareable URL, using fallback:', error);
      // Keep the fallback URL
    }
  }, [currentRoom, loading]);

  const copyToClipboard = async (text: string, type: 'code' | 'shareable') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleStartCall = () => {
    if (startingCall || !currentRoom) return;
    setStartingCall(true);
    router.push(`/room/${currentRoom.id}/call`);
  };

  const getFallbackUrl = (room: Room | null) => {
    if (!room || typeof window === 'undefined') return '';
    return `${window.location.origin}/join?room=${room.id}&code=${room.joinCode}`;
  };

  // ALWAYS render something - never return null or blank
  if (!mounted) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
        <p className="mt-4 text-text-muted">Please wait...</p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
        <p className="mt-4 text-text-muted">Loading room...</p>
        <p className="mt-2 text-sm text-text-muted">Room ID: {roomId || 'N/A'}</p>
      </div>
    );
  }

  // Error state
  if (error || (!loading && !currentRoom)) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface rounded-lg p-6 border border-border">
          <h2 className="text-xl font-bold mb-4 text-danger">Room Not Found</h2>
          <p className="text-text-muted mb-4">
            {error || 'The room you\'re looking for could not be found.'}
          </p>
          <div className="space-y-2">
            <p className="text-sm text-text-muted">
              Room ID: <code className="bg-background px-2 py-1 rounded">{roomId || 'N/A'}</code>
            </p>
            {error && (
              <div className="mt-4 p-3 bg-background rounded border border-border">
                <p className="text-xs font-mono text-text-muted break-all">{error}</p>
              </div>
            )}
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
              >
                Go Home
              </button>
              <button
                onClick={() => router.push('/create')}
                className="px-4 py-2 bg-surface-light hover:bg-surface-light/80 text-text rounded-lg font-medium transition-colors"
              >
                Create New Room
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state - show room UI
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
              value={shareableUrl || getFallbackUrl(currentRoom)}
              readOnly
              className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-text font-mono text-sm"
            />
            <button
              onClick={() => copyToClipboard(shareableUrl || getFallbackUrl(currentRoom), 'shareable')}
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
              value={currentRoom?.joinCode || ''}
              readOnly
              className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-text font-mono text-2xl text-center font-bold"
            />
            <button
              onClick={() => copyToClipboard(currentRoom?.joinCode || '', 'code')}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
            >
              {copied === 'code' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {currentRoom?.config?.files && currentRoom.config.files.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Files</h2>
            <div className="space-y-2">
              {currentRoom?.config?.files?.map((file) => (
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
