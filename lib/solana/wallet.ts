/**
 * Stage 3: Wallet Connection Utilities
 * 
 * Functions for:
 * - Reading USDC balance
 * - Network validation
 * - Proper error messages for missing balance or network mismatch
 * 
 * NO payments yet, NO billing
 */

import { Connection, PublicKey, Cluster } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

// USDC mint address on Solana mainnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Expected network (mainnet for production)
const EXPECTED_NETWORK: Cluster = 'mainnet-beta';

function getConnection(): Connection {
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    'https://api.mainnet-beta.solana.com';
  return new Connection(endpoint, 'confirmed');
}

/**
 * Validate that the wallet is on the correct network
 * Checks by attempting to get balance - if it works, we're likely on the right network
 * Note: Wallet adapter should handle network switching, this is a secondary check
 */
export async function validateNetwork(walletAddress: PublicKey): Promise<{
  isValid: boolean;
  network: string;
  error?: string;
}> {
  try {
    const connection = getConnection();
    
    // Try to get balance - if this works, we're connected to a valid network
    // The RPC endpoint should be mainnet based on our configuration
    const balance = await connection.getBalance(walletAddress);
    
    // Check the endpoint URL to determine network
    const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const isMainnet = endpoint.includes('mainnet') || endpoint.includes('mainnet-beta');
    
    return {
      isValid: isMainnet,
      network: isMainnet ? 'mainnet-beta' : 'unknown',
      error: isMainnet ? undefined : `Please switch to ${EXPECTED_NETWORK} network.`,
    };
  } catch (error) {
    console.error('Failed to validate network:', error);
    return {
      isValid: false,
      network: 'unknown',
      error: 'Failed to validate network. Please check your connection.',
    };
  }
}

export async function getUSDCBalance(walletAddress: PublicKey): Promise<number> {
  try {
    const connection = getConnection();
    const ata = await getAssociatedTokenAddress(USDC_MINT, walletAddress);

    try {
      const account = await getAccount(connection, ata);
      // USDC has 6 decimals
      return Number(account.amount) / 1_000_000;
    } catch (err) {
      // ATA doesn't exist, balance is 0
      return 0;
    }
  } catch (error) {
    console.error('Failed to get USDC balance:', error);
    return 0;
  }
}

export async function getSOLBalance(walletAddress: PublicKey): Promise<number> {
  try {
    const connection = getConnection();
    const balance = await connection.getBalance(walletAddress);
    return balance / 1_000_000_000; // Convert lamports to SOL
  } catch (error) {
    console.error('Failed to get SOL balance:', error);
    return 0;
  }
}

