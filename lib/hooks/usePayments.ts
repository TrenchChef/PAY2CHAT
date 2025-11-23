'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getMint,
} from '@solana/spl-token';
import { createUSDCTransferTransaction, createSplitPaymentTransaction } from '../solana/payments';
import { PLATFORM_WALLET, calculatePrepaymentAmount } from '../utils/paymentSplit';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export function usePayments() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);

  /**
   * Tip host (with 85/15 split)
   */
  const tipHost = async (hostWallet: PublicKey, amount: number) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      // Create split payment transaction (85% host, 15% platform)
      const transaction = await createSplitPaymentTransaction(
        publicKey,
        hostWallet,
        amount,
        PLATFORM_WALLET
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

  /**
   * Purchase file (with 85/15 split)
   */
  const purchaseFile = async (
    hostWallet: PublicKey,
    price: number
  ): Promise<{ success: boolean; txid: string }> => {
    if (!publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      // Create split payment transaction (85% host, 15% platform)
      const transaction = await createSplitPaymentTransaction(
        publicKey,
        hostWallet,
        price,
        PLATFORM_WALLET
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

  /**
   * Prepay for 3 minutes (with 85/15 split)
   */
  const prepayForCall = async (
    hostWallet: PublicKey,
    ratePerMinute: number
  ): Promise<{ success: boolean; txid: string }> => {
    if (!publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      const prepaymentAmount = calculatePrepaymentAmount(ratePerMinute);
      
      // Create split payment transaction (85% host, 15% platform)
      const transaction = await createSplitPaymentTransaction(
        publicKey,
        hostWallet,
        prepaymentAmount,
        PLATFORM_WALLET
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      return { success: true, txid: signature };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to prepay for call');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Pay per minute (with 85/15 split)
   */
  const payPerMinute = async (
    hostWallet: PublicKey,
    ratePerMinute: number
  ): Promise<{ success: boolean; txid: string }> => {
    if (!publicKey) throw new Error('Wallet not connected');

    setLoading(true);
    try {
      // Create split payment transaction (85% host, 15% platform)
      const transaction = await createSplitPaymentTransaction(
        publicKey,
        hostWallet,
        ratePerMinute,
        PLATFORM_WALLET
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      return { success: true, txid: signature };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to pay per minute');
    } finally {
      setLoading(false);
    }
  };

  return {
    tipHost,
    purchaseFile,
    prepayForCall,
    payPerMinute,
    loading,
  };
}

