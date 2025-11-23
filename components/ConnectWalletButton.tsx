'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletStore } from '@/lib/store/useWalletStore';
import { useEffect } from 'react';

export function ConnectWalletButton() {
  const { publicKey, wallet, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const { setWallet, disconnect: disconnectStore } = useWalletStore();

  useEffect(() => {
    if (publicKey && wallet) {
      setWallet(publicKey, wallet.adapter.name);
    } else {
      disconnectStore();
    }
  }, [publicKey, wallet, setWallet, disconnectStore]);

  const handleClick = () => {
    if (publicKey) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <button
      onClick={handleClick}
      disabled={connecting}
      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {connecting
        ? 'Connecting...'
        : publicKey
        ? formatAddress(publicKey.toString())
        : 'Connect Wallet'}
    </button>
  );
}

