import { PublicKey } from '@solana/web3.js';

/**
 * Platform wallet address (15% of payments go here)
 * 
 * IMPORTANT: This is the SAME wallet for all deployments (dev, staging, production).
 * Set via NEXT_PUBLIC_PLATFORM_WALLET environment variable.
 * 
 * Default: tzyfB1MvntKPBG7QmMLFfhuyp2WSxWBezGVZ36woxGW
 * 
 * This wallet receives 15% of ALL transactions on the platform:
 * - 3-minute prepayments
 * - Per-minute X402 billing
 * - Tips
 * - File sales
 */
export const PLATFORM_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_PLATFORM_WALLET ||
  'tzyfB1MvntKPBG7QmMLFfhuyp2WSxWBezGVZ36woxGW' // Platform wallet address
);

/**
 * Fee split percentages
 */
export const HOST_FEE_PERCENTAGE = 0.85; // 85% to host
export const PLATFORM_FEE_PERCENTAGE = 0.15; // 15% to platform

/**
 * Calculate payment split amounts
 */
export function calculatePaymentSplit(totalAmount: number): {
  hostAmount: number;
  platformAmount: number;
} {
  const hostAmount = totalAmount * HOST_FEE_PERCENTAGE;
  const platformAmount = totalAmount * PLATFORM_FEE_PERCENTAGE;
  
  return {
    hostAmount: Math.round(hostAmount * 1_000_000) / 1_000_000, // Round to 6 decimals
    platformAmount: Math.round(platformAmount * 1_000_000) / 1_000_000,
  };
}

/**
 * Calculate 3-minute prepayment amount
 */
export function calculatePrepaymentAmount(ratePerMinute: number): number {
  return ratePerMinute * 3; // 3 minutes upfront
}

