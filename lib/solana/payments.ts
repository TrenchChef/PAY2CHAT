import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getMint,
} from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';

// USDC mint address on Solana mainnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Get RPC endpoint (can be configured via env)
function getConnection(): Connection {
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    'https://api.mainnet-beta.solana.com';
  return new Connection(endpoint, 'confirmed');
}

interface TipHostParams {
  hostWallet: PublicKey;
  amount: number;
}

export async function tipHost({ hostWallet, amount }: TipHostParams) {
  // This would use the wallet adapter hook in a component
  // For now, this is a placeholder that shows the structure
  // In production, this would:
  // 1. Get the user's wallet from wallet adapter
  // 2. Get or create ATA for USDC
  // 3. Create transfer instruction
  // 4. Sign and send transaction

  throw new Error(
    'tipHost must be called from a component with wallet adapter context'
  );
}

interface PurchaseFileParams {
  fileId: string;
  price: number;
  hostWallet: PublicKey;
}

export async function purchaseFile({
  fileId,
  price,
  hostWallet,
}: PurchaseFileParams) {
  // Similar structure to tipHost
  // In production, this would:
  // 1. Transfer USDC from invitee to host
  // 2. Record purchase on-chain (or via server)
  // 3. Return transaction signature

  throw new Error(
    'purchaseFile must be called from a component with wallet adapter context'
  );
}

// Helper to create USDC transfer transaction
export async function createUSDCTransferTransaction(
  from: PublicKey,
  to: PublicKey,
  amount: number
): Promise<Transaction> {
  const connection = getConnection();
  const mint = await getMint(connection, USDC_MINT);

  // Convert amount to token amount (USDC has 6 decimals)
  const amountInSmallestUnit = BigInt(Math.floor(amount * 1_000_000));

  const fromATA = await getAssociatedTokenAddress(USDC_MINT, from);
  const toATA = await getAssociatedTokenAddress(USDC_MINT, to);

  const transaction = new Transaction().add(
    createTransferInstruction(
      fromATA,
      toATA,
      from,
      amountInSmallestUnit
    )
  );

  return transaction;
}

/**
 * Create split payment transaction (85% to host, 15% to platform)
 */
export async function createSplitPaymentTransaction(
  from: PublicKey,
  hostWallet: PublicKey,
  totalAmount: number,
  platformWallet: PublicKey
): Promise<Transaction> {
  const connection = getConnection();
  const mint = await getMint(connection, USDC_MINT);

  // Calculate split
  const hostAmount = totalAmount * 0.85;
  const platformAmount = totalAmount * 0.15;

  // Convert to token amounts (USDC has 6 decimals)
  const hostAmountInSmallestUnit = BigInt(Math.floor(hostAmount * 1_000_000));
  const platformAmountInSmallestUnit = BigInt(Math.floor(platformAmount * 1_000_000));

  const fromATA = await getAssociatedTokenAddress(USDC_MINT, from);
  const hostATA = await getAssociatedTokenAddress(USDC_MINT, hostWallet);
  const platformATA = await getAssociatedTokenAddress(USDC_MINT, platformWallet);

  const transaction = new Transaction()
    .add(
      createTransferInstruction(
        fromATA,
        hostATA,
        from,
        hostAmountInSmallestUnit
      )
    )
    .add(
      createTransferInstruction(
        fromATA,
        platformATA,
        from,
        platformAmountInSmallestUnit
      )
    );

  return transaction;
}

