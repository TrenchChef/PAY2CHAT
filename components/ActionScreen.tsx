'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Spinner } from './Spinner';

export function ActionScreen() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [navigating, setNavigating] = useState<string | null>(null);

  const handleCreateRoom = () => {
    if (navigating) return;
    if (!publicKey) {
      setVisible(true);
      return;
    }
    setNavigating('create');
    router.push('/create');
  };

  const handleJoinRoom = () => {
    if (navigating) return;
    if (!publicKey) {
      setVisible(true);
      return;
    }
    setNavigating('join');
    router.push('/join');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid md:grid-cols-2 gap-6">
        <div id="create" className="bg-surface rounded-lg p-8 border border-border hover:border-primary transition-colors scroll-mt-20">
          <div className="text-4xl mb-4">🎥</div>
          <h2 className="text-2xl font-bold mb-2">Create Room</h2>
          <p className="text-text-muted mb-6">
            Set your rate. Get paid instantly by the minute.
          </p>
          <button
            onClick={handleCreateRoom}
            disabled={navigating !== null}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {navigating === 'create' ? (
              <>
                <Spinner size="sm" />
                <span>Loading...</span>
              </>
            ) : (
              'Create Chat'
            )}
          </button>
        </div>

        <div id="join" className="bg-surface rounded-lg p-8 border border-border hover:border-secondary transition-colors scroll-mt-20">
          <div className="text-4xl mb-4">👤+</div>
          <h2 className="text-2xl font-bold mb-2">Join Room</h2>
          <p className="text-text-muted mb-6">
            Chat Instantly. Pay Instantly. No Bank Required.
          </p>
          <button
            onClick={handleJoinRoom}
            disabled={navigating !== null}
            className="w-full py-3 bg-secondary hover:bg-secondary/80 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {navigating === 'join' ? (
              <>
                <Spinner size="sm" />
                <span>Loading...</span>
              </>
            ) : (
              'Join Chat'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

