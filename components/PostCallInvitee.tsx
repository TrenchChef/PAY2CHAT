'use client';

import { useState } from 'react';
import { useRoomStore } from '@/lib/store/useRoomStore';
import { TipModal } from './TipModal';
import { FilePurchaseModal } from './FilePurchaseModal';

export function PostCallInvitee() {
  const { currentRoom } = useRoomStore();
  const [showTipModal, setShowTipModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [receipt] = useState({
    minutes: 5, // TODO: Calculate from actual call duration
    totalBilled: 5, // TODO: Calculate from actual billing
    tipsSent: 10, // TODO: Sum from actual tips
    filesPurchased: 1, // TODO: Count from actual purchases
    filesTotal: 20, // TODO: Sum from actual file purchases
  });

  const totalSpent = receipt.totalBilled + receipt.tipsSent + receipt.filesTotal;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Call Ended</h1>

      <div className="bg-surface rounded-lg p-6 border border-border space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Final Receipt</h2>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center p-3 bg-background rounded border border-border">
              <span>Minutes Billed</span>
              <span className="font-bold">{receipt.minutes} min × {currentRoom?.config.rate || 0} USDC</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-background rounded border border-border">
              <span>Total Billed</span>
              <span className="font-bold">{receipt.totalBilled} USDC</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-background rounded border border-border">
              <span>Tips Sent</span>
              <span className="font-bold text-secondary">{receipt.tipsSent} USDC</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-background rounded border border-border">
              <span>Files Purchased</span>
              <span className="font-bold text-accent">
                {receipt.filesPurchased} file(s) - {receipt.filesTotal} USDC
              </span>
            </div>

            <div className="flex justify-between items-center p-4 bg-primary/10 rounded border border-primary">
              <span className="text-lg font-bold">Total Spent</span>
              <span className="text-2xl font-bold text-primary">
                {totalSpent} USDC
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setShowTipModal(true)}
            className="w-full py-3 bg-accent hover:bg-accent/80 text-white rounded-lg font-medium transition-colors"
          >
            Send Final Tip
          </button>

          {currentRoom?.config.files.filter((f) => f.purchasableAfterCall).length ? (
            <button
              onClick={() => setShowFileModal(true)}
              className="w-full py-3 bg-secondary hover:bg-secondary/80 text-white rounded-lg font-medium transition-colors"
            >
              Purchase Files
            </button>
          ) : null}
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

      {showTipModal && (
        <TipModal
          onClose={() => setShowTipModal(false)}
          hostWallet={currentRoom?.hostWallet}
        />
      )}

      {showFileModal && currentRoom && (
        <FilePurchaseModal
          onClose={() => setShowFileModal(false)}
          files={currentRoom.config.files.filter((f) => f.purchasableAfterCall)}
          hostWallet={currentRoom.hostWallet}
        />
      )}
    </div>
  );
}

