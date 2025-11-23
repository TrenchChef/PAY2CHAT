'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { joinRoom } from '@/lib/room/joinRoom';
import { Room } from '@/lib/store/useRoomStore';

interface JoinRoomFormProps {
  initialRoomId?: string;
  initialCode?: string;
}

export function JoinRoomForm({ initialRoomId, initialCode }: JoinRoomFormProps) {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [roomInput, setRoomInput] = useState(initialRoomId || initialCode || '');
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialRoomId || initialCode) {
      handleJoin();
    }
  }, [initialRoomId, initialCode]);

  const handleJoin = async () => {
    if (!roomInput.trim()) {
      setError('Please enter a room code or URL');
      return;
    }

    if (!publicKey) {
      setVisible(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const joinedRoom = await joinRoom(roomInput, publicKey);
      setRoom(joinedRoom);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  if (room) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Pre-Call Lobby</h1>
        <div className="bg-surface rounded-lg p-6 border border-border space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-2">Host</h2>
            <p className="text-text-muted">
              {room.hostWallet.toString().slice(0, 4)}...
              {room.hostWallet.toString().slice(-4)}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2">Rate</h2>
            <p className="text-2xl font-bold text-primary">
              {room.config.rate} USDC/min
            </p>
          </div>

          {room.config.description && (
            <div>
              <h2 className="text-xl font-bold mb-2">Description</h2>
              <p className="text-text-muted">{room.config.description}</p>
            </div>
          )}

          {room.config.files.filter((f) => f.visibleBeforeCall).length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-2">Available Files</h2>
              <div className="space-y-2">
                {room.config.files
                  .filter((f) => f.visibleBeforeCall)
                  .map((file) => (
                    <div
                      key={file.id}
                      className="bg-background rounded p-3 border border-border"
                    >
                      <div className="flex justify-between">
                        <span>{file.name}</span>
                        <span className="font-bold">{file.price} USDC</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="bg-background rounded p-4 border border-border">
            <p className="text-sm text-text-muted mb-4">
              By joining this call, you agree to:
            </p>
            <ul className="text-sm text-text-muted space-y-2 list-disc list-inside">
              <li>Pay {room.config.rate} USDC per minute</li>
              <li>On-chain transaction finality</li>
              <li>Billing model and terms</li>
            </ul>
          </div>

          <button
            onClick={() => router.push(`/room/${room.id}/call`)}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
          >
            Agree & Join Call
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Join Room</h1>
      <div className="bg-surface rounded-lg p-6 border border-border space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Room Code or URL
          </label>
          <input
            type="text"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            placeholder="Enter room code or paste invite URL"
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text"
          />
          {error && <p className="text-danger text-sm mt-2">{error}</p>}
        </div>

        <button
          onClick={handleJoin}
          disabled={loading || !roomInput.trim()}
          className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Joining...' : 'Join Room'}
        </button>
      </div>
    </div>
  );
}

