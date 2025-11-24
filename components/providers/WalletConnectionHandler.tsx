'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

/**
 * WalletConnectionHandler ensures that when a wallet is selected from the modal,
 * connect() is called immediately to preserve the user gesture chain.
 * This component should be used inside WalletModalProvider.
 */
export function WalletConnectionHandler() {
  const { wallet, publicKey, connecting, connect } = useWallet();
  const { setVisible } = useWalletModal();
  const connectionAttemptedRef = useRef<string | null>(null);
  const prevWalletRef = useRef<string | null>(null);

  // Use useLayoutEffect for faster execution - runs synchronously before browser paint
  // This helps preserve the user gesture chain better than useEffect
  useLayoutEffect(() => {
    // Only proceed if:
    // 1. A wallet is selected
    // 2. Not already connected
    // 3. Not currently connecting
    // 4. connect function is available
    // 5. Wallet actually changed (not just re-render)
    if (!wallet || publicKey || connecting || !connect) {
      return;
    }

    const walletName = wallet.adapter.name;
    const prevWalletName = prevWalletRef.current;

    // Skip if this is the same wallet we just tried to connect
    if (connectionAttemptedRef.current === walletName) {
      return;
    }

    // Only proceed if wallet actually changed (not initial render with same wallet)
    if (prevWalletName === walletName) {
      return;
    }

    // Update previous wallet ref
    prevWalletRef.current = walletName;

    // Mark that we're attempting connection for this wallet
    connectionAttemptedRef.current = walletName;

    console.log('🔌 [WalletConnectionHandler] Wallet selected, connecting immediately:', {
      wallet: walletName,
      adapter: wallet.adapter.constructor.name,
      readyState: wallet.adapter.readyState,
    });

    // CRITICAL: Call connect() immediately in the same tick
    // useLayoutEffect runs synchronously before paint, which helps preserve the gesture chain
    // This is the best we can do without intercepting the modal's internal click handler
    connect()
      .then(() => {
        console.log('✅ [WalletConnectionHandler] Wallet connected successfully');
        setVisible(false);
        connectionAttemptedRef.current = null;
      })
      .catch((error: any) => {
        console.error('❌ [WalletConnectionHandler] Connection failed:', error);
        // Reset on user rejection so they can try again
        if (error?.message?.includes('rejected') || error?.message?.includes('User rejected')) {
          connectionAttemptedRef.current = null;
          prevWalletRef.current = null;
        }
        // Don't reset on other errors - user must manually retry
      });
  }, [wallet, publicKey, connecting, connect, setVisible]);

  // Reset refs when wallet disconnects
  useEffect(() => {
    if (!wallet || !publicKey) {
      connectionAttemptedRef.current = null;
      if (!wallet) {
        prevWalletRef.current = null;
      }
    }
  }, [wallet, publicKey]);

  return null; // This component doesn't render anything
}

