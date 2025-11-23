'use client';

import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

export function ActionScreen() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const handleCreateRoom = () => {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    router.push('/create');
  };

  const handleJoinRoom = () => {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    router.push('/join');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Private P2P Video Chat with Crypto Payments
        </h1>
        <p className="text-text-muted text-lg">
          Built on Solana. Wallet-to-wallet transactions settle in seconds.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-surface rounded-lg p-8 border border-border hover:border-primary transition-colors">
          <div className="text-4xl mb-4">🎥</div>
          <h2 className="text-2xl font-bold mb-2">Create Room</h2>
          <p className="text-text-muted mb-6">
            Set your rate. Get paid instantly by the minute.
          </p>
          <button
            onClick={handleCreateRoom}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
          >
            Create Chat
          </button>
        </div>

        <div className="bg-surface rounded-lg p-8 border border-border hover:border-secondary transition-colors">
          <div className="text-4xl mb-4">👤+</div>
          <h2 className="text-2xl font-bold mb-2">Join Room</h2>
          <p className="text-text-muted mb-6">
            Chat Instantly. Pay Instantly. No Bank Required.
          </p>
          <button
            onClick={handleJoinRoom}
            className="w-full py-3 bg-secondary hover:bg-secondary/80 text-white rounded-lg font-medium transition-colors"
          >
            Join Chat
          </button>
        </div>
      </div>
    </div>
  );
}

