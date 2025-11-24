'use client';

import { useState, useEffect } from 'react';
import { useAdBlocker } from './providers/AdBlockerProvider';
import { Spinner } from './Spinner';

export function AdBlockerModal() {
  const { adBlockerDetected, isChecking, recheckAdBlocker, dismissAdBlocker, isDismissed } = useAdBlocker();
  const [isRechecking, setIsRechecking] = useState(false);
  const [recheckSuccess, setRecheckSuccess] = useState(false);

  // Don't show if not detected, dismissed, or still checking
  if (!adBlockerDetected || isDismissed || isChecking) {
    return null;
  }

  // Watch for ad blocker state changes after recheck
  useEffect(() => {
    if (!isChecking && !adBlockerDetected && isRechecking) {
      // Ad blocker was disabled!
      setRecheckSuccess(true);
      setIsRechecking(false);
      // Auto-dismiss after showing success
      setTimeout(() => {
        dismissAdBlocker();
      }, 2000);
    } else if (!isChecking && adBlockerDetected && isRechecking) {
      // Still detected
      setIsRechecking(false);
    }
  }, [adBlockerDetected, isChecking, isRechecking, dismissAdBlocker]);

  const handleRecheck = () => {
    setIsRechecking(true);
    setRecheckSuccess(false);
    recheckAdBlocker();
  };

  const handleContinueAnyway = () => {
    dismissAdBlocker();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4 border border-border shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-danger"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-4">
          Ad Blocker Detected
        </h2>

        {/* Message */}
        <div className="space-y-4 mb-6">
          <p className="text-text text-center">
            <strong>Wallet functionality requires your ad blocker to be disabled.</strong>
          </p>
          <p className="text-text-muted text-sm text-center">
            Ad blockers interfere with wallet extensions and WalletConnect connections. 
            The service will not work with an ad blocker enabled.
          </p>
        </div>

        {/* Success message (if recheck passed) */}
        {recheckSuccess && (
          <div className="mb-4 p-3 bg-success/20 border border-success/40 rounded-lg">
            <p className="text-success text-sm text-center font-medium">
              ✓ Ad blocker disabled! Proceeding...
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleRecheck}
            disabled={isRechecking}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isRechecking ? (
              <>
                <Spinner size="sm" />
                <span>Checking...</span>
              </>
            ) : (
              "I've disabled my ad blocker"
            )}
          </button>

          <button
            onClick={handleContinueAnyway}
            className="w-full py-2 text-sm text-text-muted hover:text-text underline transition-colors"
          >
            Continue anyway (service will not work)
          </button>
        </div>

        {/* Warning note */}
        <p className="mt-4 text-xs text-text-muted text-center">
          Note: You will not be able to connect your wallet or make payments with an ad blocker enabled.
        </p>
      </div>
    </div>
  );
}

