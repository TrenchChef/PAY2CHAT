'use client';

import { useMemo, ReactNode, useEffect, useState } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const [mounted, setMounted] = useState(false);
  const [WalletConnectAdapter, setWalletConnectAdapter] = useState<any>(null);

  // Dynamically import WalletConnect only on client side to avoid SSR issues
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@solana/wallet-adapter-walletconnect').then((module) => {
        setWalletConnectAdapter(() => module.WalletConnectWalletAdapter);
        setMounted(true);
      });
    }
  }, []);

  const wallets = useMemo(
    () => {
      // Return empty array during SSR or before WalletConnect is loaded
      if (!mounted || !WalletConnectAdapter || typeof window === 'undefined') {
        return [];
      }
      
      try {
        return [
          new WalletConnectAdapter({
            network,
            options: {
              projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '95fc302318115bf010b00135cec1eeb2',
              metadata: {
                name: 'Pay2Chat',
                description: 'Peer-to-peer video chat with Solana USDC payments',
                url: 'https://pay2chat.vercel.app',
                icons: ['https://pay2chat.vercel.app/icon.svg'],
              },
            },
          }),
        ];
      } catch (error) {
        console.error('Failed to initialize WalletConnect adapter:', error);
        return [];
      }
    },
    [network, mounted, WalletConnectAdapter]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

