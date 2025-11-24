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
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { GlowWalletAdapter } from '@solana/wallet-adapter-glow';

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
      // Return empty array during SSR
      if (typeof window === 'undefined') {
        return [];
      }

      const walletAdapters = [];

      // Add desktop extension adapters (auto-detect installed extensions)
      try {
        walletAdapters.push(new PhantomWalletAdapter());
      } catch (error) {
        console.error('Failed to initialize Phantom adapter:', error);
      }

      try {
        walletAdapters.push(new SolflareWalletAdapter());
      } catch (error) {
        console.error('Failed to initialize Solflare adapter:', error);
      }

      try {
        walletAdapters.push(new BackpackWalletAdapter());
      } catch (error) {
        console.error('Failed to initialize Backpack adapter:', error);
      }

      try {
        walletAdapters.push(new GlowWalletAdapter());
      } catch (error) {
        console.error('Failed to initialize Glow adapter:', error);
      }

      // Add WalletConnect adapter (for mobile/QR code support)
      // Only add if it's loaded and mounted
      if (mounted && WalletConnectAdapter) {
        try {
          walletAdapters.push(
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
            })
          );
        } catch (error) {
          console.error('Failed to initialize WalletConnect adapter:', error);
        }
      }

      return walletAdapters;
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

