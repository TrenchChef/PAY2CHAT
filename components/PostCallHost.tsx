'use client';

import { useState } from 'react';
import { useRoomStore } from '@/lib/store/useRoomStore';

export function PostCallHost() {
  const { currentRoom } = useRoomStore();
  const [earnings] = useState({
    minutes: 5, // TODO: Calculate from actual call duration
    tips: 10, // TODO: Sum from actual tips
    fileSales: 20, // TODO: Sum from actual file purchases
  });

  const totalEarnings = earnings.minutes + earnings.tips + earnings.fileSales;

  const handleShareTwitter = () => {
    const text = encodeURIComponent(
      'Just finished a session on x402Chat — encrypted WebRTC + instant Solana micropayments.'
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Call Ended</h1>

      <div className="bg-surface rounded-lg p-6 border border-border space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Earnings Summary</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-background rounded border border-border">
              <span>Minutes Billed</span>
              <span className="font-bold">{earnings.minutes} USDC</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-background rounded border border-border">
              <span>Tips Received</span>
              <span className="font-bold text-secondary">{earnings.tips} USDC</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-background rounded border border-border">
              <span>File Sales</span>
              <span className="font-bold text-accent">{earnings.fileSales} USDC</span>
            </div>

            <div className="flex justify-between items-center p-4 bg-primary/10 rounded border border-primary">
              <span className="text-lg font-bold">Total Earnings</span>
              <span className="text-2xl font-bold text-primary">
                {totalEarnings} USDC
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <button
            onClick={handleShareTwitter}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
          >
            Share on Twitter
          </button>
        </div>

        <div className="pt-4 border-t border-border">
          <a
            href="/"
            className="block w-full py-3 bg-surface-light hover:bg-surface-light/80 text-text rounded-lg font-medium transition-colors text-center"
          >
            Return Home
          </a>
        </div>
      </div>
    </div>
  );
}

