'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletStore } from '@/lib/store/useWalletStore';
import { useEffect, useState } from 'react';
import { getUSDCBalance } from '@/lib/solana/wallet';

export function ConnectWalletButton() {
  const { publicKey, wallet, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const { setWallet, disconnect: disconnectStore } = useWalletStore();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  useEffect(() => {
    if (publicKey && wallet) {
      setWallet(publicKey, wallet.adapter.name);
      // Load balance
      setLoadingBalance(true);
      getUSDCBalance(publicKey)
        .then((bal) => {
          setBalance(bal);
          setLoadingBalance(false);
        })
        .catch(() => {
          setBalance(0);
          setLoadingBalance(false);
        });
    } else {
      disconnectStore();
      setBalance(null);
    }
  }, [publicKey, wallet, setWallet, disconnectStore]);

  const handleDisconnect = async () => {
    try {
      console.log('🔌 Disconnecting wallet...');
      
      // Disconnect from the adapter first
      if (disconnect) {
        await disconnect().catch((err) => {
          console.warn('⚠️ Disconnect error from adapter:', err);
          // Continue with cleanup even if adapter disconnect fails
        });
      }
      
      // Clear the wallet store and balance
      disconnectStore();
      setBalance(null);
      
      console.log('✅ Wallet disconnected successfully');
    } catch (error) {
      console.error('❌ Error during wallet disconnect:', error);
      // Always clear the store even if disconnect fails
      disconnectStore();
      setBalance(null);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // When connected, show status and balance (no connect button)
  if (publicKey) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-mono text-text-muted">
            {formatAddress(publicKey.toString())}
          </div>
          <div className="text-xs text-text-muted">
            {loadingBalance ? 'Loading...' : balance !== null ? `${balance.toFixed(2)} USDC` : '—'}
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          className="px-3 py-1.5 text-sm bg-surface-light hover:bg-surface-light/80 text-text rounded-lg font-medium transition-colors"
          title="Disconnect wallet"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // When not connected, don't show anything (wallet connection handled in forms)
  return null;
}

