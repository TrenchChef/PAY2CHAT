/**
 * Stage 4: USDC Transfer Engine
 * 
 * Low-level Solana USDC transfer logic:
 * - Function to send USDC from Invitee → Host
 * - Confirmation events
 * - Retry strategies
 * - Proper error responses:
 *   - insufficient funds
 *   - user rejects transaction
 *   - RPC failure
 * 
 * Do NOT integrate this into call flow yet.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getMint,
  TOKEN_PROGRAM_ID,
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

export interface TransferResult {
  success: boolean;
  signature?: string;
  error?: TransferError;
}

export interface TransferError {
  code: TransferErrorCode;
  message: string;
}

export enum TransferErrorCode {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  USER_REJECTED = 'USER_REJECTED',
  RPC_FAILURE = 'RPC_FAILURE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface TransferUSDCParams {
  from: PublicKey; // Invitee wallet
  to: PublicKey; // Host wallet
  amount: number; // Amount in USDC (will be converted to smallest unit)
  signTransaction: (transaction: Transaction) => Promise<Transaction>; // Wallet signer function
  maxRetries?: number; // Maximum retry attempts (default: 3)
}

/**
 * Transfer USDC from one wallet to another
 * 
 * @param params Transfer parameters
 * @returns Transfer result with signature or error
 */
export async function transferUSDC(params: TransferUSDCParams): Promise<TransferResult> {
  const { from, to, amount, signTransaction, maxRetries = 3 } = params;

  // Validate inputs
  if (amount <= 0) {
    return {
      success: false,
      error: {
        code: TransferErrorCode.INVALID_ADDRESS,
        message: 'Amount must be greater than 0',
      },
    };
  }

  try {
    // Validate addresses
    new PublicKey(from);
    new PublicKey(to);
  } catch (error) {
    return {
      success: false,
      error: {
        code: TransferErrorCode.INVALID_ADDRESS,
        message: 'Invalid wallet address',
      },
    };
  }

  const connection = getConnection();

  // Retry logic
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get or create associated token addresses
      const fromATA = await getAssociatedTokenAddress(USDC_MINT, from);
      const toATA = await getAssociatedTokenAddress(USDC_MINT, to);

      // Get USDC mint info to determine decimals (should be 6)
      const mintInfo = await getMint(connection, USDC_MINT);
      const decimals = mintInfo.decimals;

      // Convert amount to smallest unit (micro-USDC)
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));

      // Check balance before attempting transfer
      try {
        const fromAccount = await connection.getTokenAccountBalance(fromATA);
        const balance = Number(fromAccount.value.amount);

        if (balance < amountInSmallestUnit) {
          return {
            success: false,
            error: {
              code: TransferErrorCode.INSUFFICIENT_FUNDS,
              message: `Insufficient USDC balance. Required: ${amount} USDC, Available: ${balance / Math.pow(10, decimals)} USDC`,
            },
          };
        }
      } catch (error) {
        // ATA doesn't exist, balance is 0
        return {
          success: false,
          error: {
            code: TransferErrorCode.INSUFFICIENT_FUNDS,
            message: 'No USDC balance found. Please ensure you have USDC in your wallet.',
          },
        };
      }

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        fromATA,
        toATA,
        from,
        amountInSmallestUnit,
        [],
        TOKEN_PROGRAM_ID
      );

      // Create transaction
      const transaction = new Transaction().add(transferInstruction);

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = from;

      // Sign transaction (this may throw if user rejects)
      let signedTransaction: Transaction;
      try {
        signedTransaction = await signTransaction(transaction);
      } catch (error: any) {
        // User rejected the transaction
        if (error.code === 4001 || error.message?.includes('reject') || error.message?.includes('denied')) {
          return {
            success: false,
            error: {
              code: TransferErrorCode.USER_REJECTED,
              message: 'Transaction was rejected by user',
            },
          };
        }
        throw error; // Re-throw if it's not a rejection
      }

      // Send and confirm transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        maxRetries: 0, // We handle retries ourselves
      });

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      // Success!
      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      lastError = error;

      // Check if it's a network/RPC error (retry-able)
      const isRetryable =
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('fetch failed') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT';

      // Don't retry if it's not a retry-able error or we've exhausted retries
      if (!isRetryable || attempt === maxRetries) {
        // Determine error code
        let errorCode = TransferErrorCode.UNKNOWN_ERROR;
        let errorMessage = error.message || 'Unknown error occurred';

        if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
          errorCode = TransferErrorCode.INSUFFICIENT_FUNDS;
        } else if (error.message?.includes('network') || error.message?.includes('RPC')) {
          errorCode = TransferErrorCode.RPC_FAILURE;
        } else if (error.message?.includes('reject') || error.message?.includes('denied')) {
          errorCode = TransferErrorCode.USER_REJECTED;
        }

        return {
          success: false,
          error: {
            code: errorCode,
            message: errorMessage,
          },
        };
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but just in case
  return {
    success: false,
    error: {
      code: TransferErrorCode.UNKNOWN_ERROR,
      message: lastError?.message || 'Transfer failed after all retries',
    },
  };
}

/**
 * Helper function to create a signer function from wallet adapter
 * This should be called from a component that has wallet context
 */
export function createSignerFunction(
  publicKey: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>
): (transaction: Transaction) => Promise<Transaction> {
  return async (transaction: Transaction) => {
    // Ensure the transaction fee payer is set
    if (!transaction.feePayer) {
      transaction.feePayer = publicKey;
    }
    return signTransaction(transaction);
  };
}
