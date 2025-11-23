'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRoomStore } from '@/lib/store/useRoomStore';

export function HostLobby() {
  const router = useRouter();
  const { currentRoom, updateRoomConfig } = useRoomStore();
  const [copied, setCopied] = useState<'url' | 'code' | null>(null);

  useEffect(() => {
    if (!currentRoom) {
      router.push('/');
      return;
    }

    // Listen for invitee joining (in production, this would be via WebSocket or polling)
    // For now, we'll navigate to call when user clicks "Start Call" or auto-navigate after delay
  }, [currentRoom, router]);

  if (!currentRoom) return null;

  const copyToClipboard = async (text: string, type: 'url' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleStartCall = () => {
    router.push(`/room/${currentRoom.id}/call`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Host Lobby</h1>

      <div className="bg-surface rounded-lg p-6 border border-border space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-2">Room URL</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={currentRoom.url}
              readOnly
              className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-text font-mono text-sm"
            />
            <button
              onClick={() => copyToClipboard(currentRoom.url, 'url')}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
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

        <div>
          <h2 className="text-xl font-bold mb-2">Description</h2>
          <textarea
            value={currentRoom.config.description}
            onChange={(e) =>
              updateRoomConfig({ description: e.target.value })
            }
            rows={4}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text"
          />
          <p className="text-sm text-text-muted mt-1">
            You can modify the description, but not the rate or files.
          </p>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-text-muted mb-4">Waiting for invitee to join...</p>
          <button
            onClick={handleStartCall}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
          >
            Start Call (Test)
          </button>
        </div>
      </div>
    </div>
  );
}

