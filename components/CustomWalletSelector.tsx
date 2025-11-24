'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback } from 'react';

interface CustomWalletSelectorProps {
  onClose: () => void;
}

// Wallet options that match the adapters in WalletProvider
// Standard Wallets (Phantom, Trust, Coinbase) are auto-detected
const WALLET_OPTIONS = [
  { name: 'Phantom', adapterName: 'Phantom' as const },
  { name: 'Solflare', adapterName: 'Solflare' as const },
  { name: 'Backpack', adapterName: 'Backpack' as const },
  { name: 'Glow', adapterName: 'Glow' as const },
  { name: 'Trust Wallet', adapterName: 'Trust' as const },
  { name: 'Coinbase Wallet', adapterName: 'Coinbase Wallet' as const },
];

export function CustomWalletSelector({ onClose }: CustomWalletSelectorProps) {
  const { select, connect, connecting, wallet } = useWallet();

  const handleWalletClick = useCallback((adapterName: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      console.log('🔌 [CustomSelector] User clicked wallet:', adapterName);
      
      // CRITICAL: Select and connect must happen synchronously in the click handler
      // This preserves the user gesture chain required for wallet extension popups
      
      // Select the wallet first - this is synchronous
      // The select function accepts a WalletName type, but we can cast the string
      select(adapterName as any);
      
      // Immediately call connect() - this is synchronous (the promise resolves async, but the call is sync)
      // This preserves the gesture chain because it's called directly in the click handler
      // We don't await - the call itself is synchronous, preserving the gesture chain
      connect()
        .then(() => {
          console.log('✅ [CustomSelector] Wallet connected successfully');
          onClose();
        })
        .catch((error: any) => {
          console.error('❌ [CustomSelector] Connection failed:', error);
          // Error will be handled by the parent component via connectionError state
        });
    } catch (error: any) {
      console.error('❌ [CustomSelector] Wallet selection failed:', error);
    }
  }, [select, connect, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-lg p-6 border border-border max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Connect a wallet on Solana to continue</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-2">
          {WALLET_OPTIONS.map((option) => (
            <button
              key={option.adapterName}
              onClick={(e) => handleWalletClick(option.adapterName, e)}
              disabled={connecting}
              className="w-full p-4 bg-background hover:bg-surface-light border border-border rounded-lg flex items-center justify-between transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-medium">{option.name}</span>
              {connecting && wallet?.adapter.name === option.adapterName && (
                <span className="text-sm text-text-muted">Connecting...</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

