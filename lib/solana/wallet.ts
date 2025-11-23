import { Connection, PublicKey } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

// USDC mint address on Solana mainnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

function getConnection(): Connection {
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    'https://api.mainnet-beta.solana.com';
  return new Connection(endpoint, 'confirmed');
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

