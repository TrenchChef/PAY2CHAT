'use client';

import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { usePayments } from '@/lib/hooks/usePayments';
import { Spinner } from './Spinner';

interface TipModalProps {
  onClose: () => void;
  hostWallet: PublicKey | undefined;
}

export function TipModal({ onClose, hostWallet }: TipModalProps) {
  const [customAmount, setCustomAmount] = useState('');
  const { tipHost, loading } = usePayments();

  if (!hostWallet) return null;

  const handleTip = async (tipAmount: number) => {
    if (!hostWallet) return;

    try {
      await tipHost(hostWallet, tipAmount);
      alert(`Tipped ${tipAmount} USDC successfully!`);
      onClose();
    } catch (error: any) {
      console.error('Tip failed:', error);
      alert(`Failed to send tip: ${error.message}`);
    }
  };

  const handleCustomTip = () => {
    const amt = parseFloat(customAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    handleTip(amt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4 border border-border">
        <h2 className="text-2xl font-bold mb-4">Tip Host</h2>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 5, 10].map((amt) => (
            <button
              key={amt}
              onClick={() => handleTip(amt)}
              disabled={loading}
              className="py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span>Processing...</span>
                </>
              ) : (
                `${amt} USDC`
              )}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Custom Amount (USDC)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-text"
              placeholder="Enter amount"
            />
            <button
              onClick={handleCustomTip}
              disabled={loading || !customAmount}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  <span>Sending...</span>
                </>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-surface-light hover:bg-surface-light/80 text-text rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

