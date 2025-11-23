import { create } from 'zustand';
import { PublicKey } from '@solana/web3.js';

interface WalletState {
  publicKey: PublicKey | null;
  walletName: string | null;
  isConnected: boolean;
  setWallet: (publicKey: PublicKey | null, walletName: string | null) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  publicKey: null,
  walletName: null,
  isConnected: false,
  setWallet: (publicKey, walletName) =>
    set({ publicKey, walletName, isConnected: !!publicKey }),
  disconnect: () =>
    set({ publicKey: null, walletName: null, isConnected: false }),
}));

