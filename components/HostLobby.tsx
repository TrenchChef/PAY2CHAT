'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useRoomStore, Room } from '@/lib/store/useRoomStore';
import { Spinner } from './Spinner';
import { encodeRoomToUrl } from '@/lib/utils/roomSharing';
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

export function HostLobby() {
  const params = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const roomIdFromParams = params?.id as string;
  const { currentRoom, setRoom } = useRoomStore();
  const [copied, setCopied] = useState<'code' | 'shareable' | null>(null);
  const [startingCall, setStartingCall] = useState(false);
  const [shareableUrl, setShareableUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get room ID - prefer useParams, fallback to pathname
  const roomId = roomIdFromParams || (typeof window !== 'undefined' ? 
    window.location.pathname.match(/\/room\/([^/]+)\/host/)?.[1] || '' : '');

  // Ensure component is mounted
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);

  // Validate room ID when mounted
  useEffect(() => {
    if (mounted && !roomId) {
      console.error('❌ No room ID found in URL');
      setError('No room ID found in URL');
      setLoading(false);
    }
  }, [mounted, roomId]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (!loading) return;
    
    const timeout = setTimeout(() => {
      if (loading && !currentRoom && !error) {
        console.warn('⚠️ Loading timeout - room not found after 5 seconds');
        setError('Room loading timed out. The room may not exist or may have expired.');
        setLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [loading, currentRoom, error]);

  // Load room - check store first, then localStorage
  useEffect(() => {
    if (!mounted || !roomId) {
      if (mounted && !roomId) {
        console.error('❌ No room ID provided in URL');
        setError('No room ID provided in URL');
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
              const hostWalletKey = safeCreatePublicKey(sessionRoom.hostWallet);
              if (!hostWalletKey) {
                console.error('❌ Invalid wallet address in sessionStorage room:', sessionRoom.hostWallet);
                throw new Error('Invalid wallet address in stored room data');
              }

              const restoredRoom: Room = {
                ...sessionRoom,
                hostWallet: hostWalletKey,
              };

              // Validate room structure
              if (!restoredRoom.id || !restoredRoom.joinCode || !restoredRoom.config) {
                console.error('❌ Invalid room structure in sessionStorage');
                throw new Error('Invalid room structure');
              }

              setRoom(restoredRoom, true);
              setError(null);
              setLoading(false);
              console.log('✅ Room restored from sessionStorage successfully');
              return;
            } catch (pkError: any) {
              console.error('❌ Failed to restore PublicKey from sessionStorage:', pkError);
              // Clear corrupted sessionStorage room
              try {
                sessionStorage.removeItem('current_room');
              } catch (clearError) {
                // Ignore
              }
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
      
      // Validate wallet address format before attempting to create PublicKey
      const hostWalletKey = safeCreatePublicKey(roomData.hostWallet);
      if (!hostWalletKey) {
        console.error('❌ Invalid wallet address in room data:', roomData.hostWallet);
        setError(`Failed to restore room data: Invalid wallet address format. Please create a new room.`);
        setLoading(false);
        return;
      }

      // Restore room with PublicKey
      try {
        const restoredRoom: Room = {
          ...roomData,
          hostWallet: hostWalletKey,
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
        console.log('✅ Room restored successfully from localStorage');
      } catch (pkError: any) {
        console.error('❌ Failed to restore room:', pkError);
        setError(`Failed to restore room data: ${pkError.message || 'Invalid room data'}. Please create a new room.`);
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

  // Debug logging
  useEffect(() => {
    console.log('🔍 HostLobby render state:', {
      mounted,
      roomId,
      loading,
      error,
      hasCurrentRoom: !!currentRoom,
      currentRoomId: currentRoom?.id,
    });
  }, [mounted, roomId, loading, error, currentRoom]);

  // ALWAYS render something - never return null or blank
  // Always render with visible content, even during loading
  // Use inline styles to ensure visibility even if CSS fails to load
  const baseStyles = {
    color: '#FFFFFF',
    backgroundColor: '#181c20',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  if (!mounted) {
    console.log('📄 HostLobby: Not mounted yet, showing loading');
    return (
      <div 
        style={{
          maxWidth: '896px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '32px 16px',
          ...baseStyles
        }}
      >
        <Spinner size="lg" />
        <p style={{ marginTop: '16px', color: '#FFFFFF', fontSize: '16px' }}>Please wait...</p>
      </div>
    );
  }

  // Loading state - show even if roomId is missing
  if (loading) {
    return (
      <div 
        style={{
          maxWidth: '896px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '32px 16px',
          ...baseStyles
        }}
      >
        <Spinner size="lg" />
        <p style={{ marginTop: '16px', color: '#FFFFFF', fontSize: '16px' }}>Loading room...</p>
        <p style={{ marginTop: '8px', color: '#9CA3AF', fontSize: '14px' }}>
          Room ID: {roomId || 'Reading from URL...'}
        </p>
      </div>
    );
  }

  // Error state or no room found
  if (error || (!loading && !currentRoom)) {
    return (
      <div 
        style={{
          maxWidth: '896px',
          margin: '0 auto',
          padding: '32px 16px',
          ...baseStyles
        }}
      >
        <div 
          style={{
            backgroundColor: '#2A2F36',
            borderRadius: '8px',
            padding: '24px',
            border: '1px solid #3A3F46'
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#EF4444' }}>
            Room Not Found
          </h2>
          <p style={{ marginBottom: '16px', color: '#FFFFFF' }}>
            {error || 'The room you\'re looking for could not be found.'}
          </p>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '8px' }}>
              Room ID: <code style={{ backgroundColor: '#181c20', padding: '4px 8px', borderRadius: '4px', color: '#FFFFFF' }}>{roomId || 'N/A'}</code>
            </p>
            {error && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#181c20', borderRadius: '4px', border: '1px solid #3A3F46' }}>
                <p style={{ fontSize: '12px', fontFamily: 'monospace', color: '#9CA3AF', wordBreak: 'break-all' }}>{error}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <button
                onClick={() => router.push('/')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#8B5CF6',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Go Home
              </button>
              <button
                onClick={() => router.push('/create')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2A2F36',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontWeight: '500',
                  border: '1px solid #3A3F46',
                  cursor: 'pointer'
                }}
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
  // Ensure we always have a room before rendering (safety check)
  if (!currentRoom) {
    return (
      <div 
        style={{
          maxWidth: '896px',
          margin: '0 auto',
          padding: '32px 16px',
          ...baseStyles
        }}
      >
        <div 
          style={{
            backgroundColor: '#2A2F36',
            borderRadius: '8px',
            padding: '24px',
            border: '1px solid #3A3F46'
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#EF4444' }}>
            Room Not Available
          </h2>
          <p style={{ marginBottom: '16px', color: '#FFFFFF' }}>
            Room data is not available. Please create a new room.
          </p>
          <button
            onClick={() => router.push('/create')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#8B5CF6',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontWeight: '500',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Create New Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="max-w-4xl mx-auto py-8"
      style={{
        maxWidth: '896px',
        margin: '0 auto',
        padding: '32px 16px',
        ...baseStyles
      }}
    >
      <h1 
        className="text-3xl font-bold mb-8 text-text"
        style={{
          fontSize: '30px',
          fontWeight: 'bold',
          marginBottom: '32px',
          color: '#FFFFFF'
        }}
      >
        Host Lobby
      </h1>

      <div 
        className="bg-surface rounded-lg p-6 border border-border space-y-6"
        style={{
          backgroundColor: '#2A2F36',
          borderRadius: '8px',
          padding: '24px',
          border: '1px solid #3A3F46',
          ...baseStyles
        }}
      >
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
