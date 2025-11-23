'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getMint,
} from '@solana/spl-token';
import { createUSDCTransferTransaction } from '../solana/payments';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export function usePayments() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);

  const tipHost = async (hostWallet: PublicKey, amount: number) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const transaction = await createUSDCTransferTransaction(
        publicKey,
        hostWallet,
        amount
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      return { success: true, txid: signature };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send tip');
    } finally {
      setLoading(false);
    }
  };

  const purchaseFile = async (
    hostWallet: PublicKey,
    price: number
  ): Promise<{ success: boolean; txid: string }> => {
    if (!publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const transaction = await createUSDCTransferTransaction(
        publicKey,
        hostWallet,
        price
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      return { success: true, txid: signature };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to purchase file');
    } finally {
      setLoading(false);
    }
  };

  return {
    tipHost,
    purchaseFile,
    loading,
  };
}

