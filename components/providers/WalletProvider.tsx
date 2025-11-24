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
import { WalletConnectionHandler } from './WalletConnectionHandler';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { GlowWalletAdapter } from '@solana/wallet-adapter-glow';

interface WalletProviderProps {
  children: ReactNode;
}

// Explicit extension detection helpers
const detectWalletExtensions = () => {
  if (typeof window === 'undefined') return {};
  
  const detected: Record<string, boolean> = {};
  
  // Check for Phantom
  detected.phantom = !!(window as any).solana?.isPhantom;
  
  // Check for Solflare
  detected.solflare = !!(window as any).solflare;
  
  // Check for Backpack
  detected.backpack = !!(window as any).backpack;
  
  // Check for Glow
  detected.glow = !!(window as any).glow;
  
  // Also check window.solana (Standard Wallet)
  detected.solana = !!(window as any).solana;
  
  return detected;
};

export function WalletProvider({ children }: WalletProviderProps) {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const [mounted, setMounted] = useState(false);
  const [WalletConnectAdapter, setWalletConnectAdapter] = useState<any>(null);
  const [walletConnectLoaded, setWalletConnectLoaded] = useState(false);
  const [detectedExtensions, setDetectedExtensions] = useState<Record<string, boolean>>({});

  // Set mounted state immediately on client side (for desktop wallets)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);

  // Check for wallet extensions on mount and periodically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkExtensions = () => {
      const detected = detectWalletExtensions();
      setDetectedExtensions(detected);
      
      // Log detected extensions for debugging
      console.log('🔍 Wallet Extension Detection:', {
        phantom: detected.phantom,
        solflare: detected.solflare,
        backpack: detected.backpack,
        glow: detected.glow,
        solana: detected.solana,
        windowSolana: !!(window as any).solana,
      });
    };

    // Check immediately
    checkExtensions();

    // Check again after a short delay (extensions might load after page)
    const timeout1 = setTimeout(checkExtensions, 500);
    const timeout2 = setTimeout(checkExtensions, 2000);

    // Listen for extension injection events
    const handleExtensionInjection = () => {
      checkExtensions();
    };

    // Some extensions inject after page load
    window.addEventListener('load', handleExtensionInjection);
    
    // Check periodically in case extensions load late
    const interval = setInterval(checkExtensions, 3000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearInterval(interval);
      window.removeEventListener('load', handleExtensionInjection);
    };
  }, []);

  // Dynamically import WalletConnect only on client side to avoid SSR issues
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@solana/wallet-adapter-walletconnect')
        .then((module) => {
          setWalletConnectAdapter(() => module.WalletConnectWalletAdapter);
          setWalletConnectLoaded(true);
          console.log('✅ WalletConnect adapter loaded');
        })
        .catch((error) => {
          console.error('❌ Failed to load WalletConnect adapter:', error);
          // Don't block the app if WalletConnect fails to load
          setWalletConnectLoaded(false);
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
      const detected = detectWalletExtensions();

      console.log('💰 Initializing wallet adapters...', {
        detected,
        mounted,
        hasWalletConnect: !!WalletConnectAdapter,
      });

      // ALWAYS add desktop extension adapters - they will show in modal
      // The adapters themselves handle detection, but we include them regardless
      // so users can see all options (modal will show "not installed" if needed)
      try {
        const phantom = new PhantomWalletAdapter();
        walletAdapters.push(phantom);
        console.log('✅ Phantom adapter added', { 
          detected: detected.phantom,
          ready: phantom.readyState === 'Installed' || phantom.readyState === 'Loadable'
        });
      } catch (error) {
        console.error('❌ Failed to initialize Phantom adapter:', error);
      }

      try {
        const solflare = new SolflareWalletAdapter();
        walletAdapters.push(solflare);
        console.log('✅ Solflare adapter added', { 
          detected: detected.solflare,
          ready: solflare.readyState === 'Installed' || solflare.readyState === 'Loadable'
        });
      } catch (error) {
        console.error('❌ Failed to initialize Solflare adapter:', error);
      }

      try {
        const backpack = new BackpackWalletAdapter();
        walletAdapters.push(backpack);
        console.log('✅ Backpack adapter added', { 
          detected: detected.backpack,
          ready: backpack.readyState === 'Installed' || backpack.readyState === 'Loadable'
        });
      } catch (error) {
        console.error('❌ Failed to initialize Backpack adapter:', error);
      }

      try {
        const glow = new GlowWalletAdapter();
        walletAdapters.push(glow);
        console.log('✅ Glow adapter added', { 
          detected: detected.glow,
          ready: glow.readyState === 'Installed' || glow.readyState === 'Loadable'
        });
      } catch (error) {
        console.error('❌ Failed to initialize Glow adapter:', error);
      }

      // Track whether WalletConnect was actually added (not just if module loaded)
      let walletConnectAdded = false;
      
      // Add WalletConnect adapter (for mobile/QR code support)
      // Only add if it's loaded successfully
      if (walletConnectLoaded && WalletConnectAdapter) {
        try {
          // Detect if we're on mobile
          const isMobile = typeof window !== 'undefined' && 
            (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
             (window.innerWidth <= 768));

          const walletConnect = new WalletConnectAdapter({
            network,
            options: {
              projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '95fc302318115bf010b00135cec1eeb2',
              metadata: {
                name: 'Pay2Chat',
                description: 'Peer-to-peer video chat with Solana USDC payments',
                url: 'https://pay2chat.vercel.app',
                icons: ['https://pay2chat.vercel.app/icon.svg'],
              },
              // Enable mobile deep linking
              mobileLinks: {
                native: undefined, // Let WalletConnect auto-detect mobile wallets
              },
            },
          });
          walletAdapters.push(walletConnect);
          walletConnectAdded = true; // Mark as successfully added
          console.log('✅ WalletConnect adapter added', { isMobile });
        } catch (error) {
          console.error('❌ Failed to initialize WalletConnect adapter:', error);
          // Continue without WalletConnect - desktop wallets should still work
          walletConnectAdded = false; // Not added due to error
        }
      } else if (mounted && !walletConnectLoaded) {
        console.log('⏳ WalletConnect adapter still loading...');
      }

      // Calculate desktop wallets count: total minus WalletConnect (only if actually added)
      const desktopWalletsCount = walletAdapters.length - (walletConnectAdded ? 1 : 0);
      
      console.log(`🎯 Total wallets initialized: ${walletAdapters.length}`, {
        desktopWallets: desktopWalletsCount,
        walletConnect: walletConnectAdded,
        walletConnectModuleLoaded: walletConnectLoaded,
      });
      
      // Ensure we always return at least some wallets (even if WalletConnect isn't ready)
      if (walletAdapters.length === 0 && mounted) {
        console.warn('⚠️ No wallets initialized! This should not happen.');
      }
      
      return walletAdapters;
    },
    [network, mounted, walletConnectLoaded, WalletConnectAdapter]
    // Note: detectedExtensions is NOT in dependencies because we call detectWalletExtensions()
    // independently inside the memoized function. Including it would cause unnecessary
    // recreation every 3 seconds when the state updates, even though we don't use the state value.
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <WalletConnectionHandler />
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

