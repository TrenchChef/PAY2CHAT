'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRoomStore } from '@/lib/store/useRoomStore';
import { Spinner } from './Spinner';
import { encodeRoomToUrl, generateQRCodeUrl } from '@/lib/utils/roomSharing';

export function HostLobby() {
  const router = useRouter();
  const { currentRoom, updateRoomConfig } = useRoomStore();
  const [copied, setCopied] = useState<'url' | 'code' | 'shareable' | null>(null);
  const [startingCall, setStartingCall] = useState(false);
  const [shareableUrl, setShareableUrl] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (!currentRoom) {
      router.push('/');
      return;
    }

    // Generate shareable URL with encoded room data for cross-device support
    const shareable = encodeRoomToUrl(currentRoom);
    setShareableUrl(shareable);
    setQrCodeUrl(generateQRCodeUrl(shareable));

    // Listen for invitee joining (in production, this would be via WebSocket or polling)
    // For now, we'll navigate to call when user clicks "Start Call" or auto-navigate after delay
  }, [currentRoom, router]);

  if (!currentRoom) return null;

  const copyToClipboard = async (text: string, type: 'url' | 'code' | 'shareable') => {
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
          <h2 className="text-xl font-bold mb-2">Shareable Room URL (Cross-Device)</h2>
          <p className="text-sm text-text-muted mb-2">
            Share this URL to join from any device. Works across mobile and desktop.
          </p>
          <div className="flex gap-2 mb-4">
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
          
          {/* QR Code */}
          {qrCodeUrl && (
            <div className="mt-4 p-4 bg-background rounded-lg border border-border text-center">
              <p className="text-sm text-text-muted mb-2">Scan QR Code to Join</p>
              <img 
                src={qrCodeUrl} 
                alt="Room QR Code" 
                className="mx-auto max-w-[200px]"
              />
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold mb-2">Standard Room URL</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={currentRoom.url}
              readOnly
              className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-text font-mono text-sm"
            />
            <button
              onClick={() => copyToClipboard(currentRoom.url, 'url')}
              className="px-4 py-2 bg-surface-light hover:bg-surface-light/80 text-text rounded-lg font-medium transition-colors"
            >
              {copied === 'url' ? 'Copied!' : 'Copy'}
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

