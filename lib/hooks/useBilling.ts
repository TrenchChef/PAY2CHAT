'use client';

import { useEffect, useRef } from 'react';
import { usePayments } from './usePayments';
import { useCallStore } from '@/lib/store/useCallStore';
import { useRoomStore } from '@/lib/store/useRoomStore';
import { useWallet } from '@solana/wallet-adapter-react';
import type { BillingMessage } from '@/lib/webrtc/client';

interface UseBillingOptions {
  webrtcClient: any; // WebRTCClient instance
  enabled: boolean; // Only for invitee
}

export function useBilling({ webrtcClient, enabled }: UseBillingOptions) {
  const { payPerMinute } = usePayments();
  const { publicKey } = useWallet();
  const { currentRoom, isHost } = useRoomStore();
  const { 
    connectionState, 
    setBillingStatus, 
    addPayment,
    localStream,
    remoteStream,
    endCall,
  } = useCallStore();
  
  const billingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryAttemptedRef = useRef(false);
  const callStartTimeRef = useRef<number | null>(null);

  // Freeze video tracks
  const freezeVideo = () => {
    try {
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      if (remoteStream) {
        remoteStream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setBillingStatus('frozen');
    } catch (err) {
      console.error('Failed to freeze video:', err);
    }
  };

  // Unfreeze video tracks
  const unfreezeVideo = () => {
    try {
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = true;
        });
      }
      if (remoteStream) {
        remoteStream.getVideoTracks().forEach((track) => {
          track.enabled = true;
        });
      }
      setBillingStatus('paid');
    } catch (err) {
      console.error('Failed to unfreeze video:', err);
    }
  };

  // Send per-minute billing
  const sendMinuteBilling = async () => {
    if (!enabled || !currentRoom || !publicKey || isHost) {
      return;
    }

    const ratePerMinute = currentRoom.config.rate;
    if (!ratePerMinute || ratePerMinute <= 0) {
      console.warn('Invalid rate per minute');
      return;
    }

    // Send billing attempt message
    if (webrtcClient) {
      webrtcClient.sendBillingMessage({
        type: 'billing_attempt',
        amount: ratePerMinute,
        timestamp: Date.now(),
      });
    }

    setBillingStatus('pending');

    try {
      const result = await payPerMinute(currentRoom.hostWallet, ratePerMinute);
      
      if (result.success) {
        // Success
        addPayment(ratePerMinute);
        setBillingStatus('paid');
        retryAttemptedRef.current = false; // Reset retry flag on success

        // Send success message
        if (webrtcClient) {
          const currentTotal = useCallStore.getState().totalPaid;
          webrtcClient.sendBillingMessage({
            type: 'billing_success',
            amount: ratePerMinute,
            txid: result.txid,
            timestamp: Date.now(),
            totalPaid: currentTotal + ratePerMinute,
          });
        }

        // Unfreeze if previously frozen
        unfreezeVideo();
      }
    } catch (error: any) {
      console.error('Billing failed:', error);
      setBillingStatus('failed');
      
      // Send failure message
      if (webrtcClient) {
        webrtcClient.sendBillingMessage({
          type: 'billing_failed',
          amount: ratePerMinute,
          code: error.code || 'UNKNOWN',
          message: error.message || 'Payment failed',
          timestamp: Date.now(),
        });
      }

      // Freeze video immediately
      freezeVideo();

      // Retry logic
      if (!retryAttemptedRef.current) {
        retryAttemptedRef.current = true;
        
        // Wait 5 seconds before retry
        setTimeout(async () => {
          try {
            const retryResult = await payPerMinute(currentRoom.hostWallet, ratePerMinute);
            if (retryResult.success) {
              addPayment(ratePerMinute);
              setBillingStatus('paid');
              retryAttemptedRef.current = false;
              unfreezeVideo();
              
              if (webrtcClient) {
                webrtcClient.sendBillingMessage({
                  type: 'billing_success',
                  amount: ratePerMinute,
                  txid: retryResult.txid,
                  timestamp: Date.now(),
                });
              }
            } else {
              // Retry failed - end call after 3 seconds
              setTimeout(() => {
                endCall();
              }, 3000);
            }
          } catch (retryError) {
            // Retry failed - end call after 3 seconds
            setTimeout(() => {
              endCall();
            }, 3000);
          }
        }, 5000);
      } else {
        // Already retried - end call after 3 seconds
        setTimeout(() => {
          endCall();
        }, 3000);
      }
    }
  };

  // Start billing when connected
  useEffect(() => {
    if (!enabled || !currentRoom || isHost || connectionState !== 'connected') {
      return;
    }

    // Record call start time
    callStartTimeRef.current = Date.now();

    // Start billing interval (every 60 seconds)
    // Note: First 3 minutes are covered by prepay, so first billing happens at 3 minutes (180 seconds)
    billingIntervalRef.current = setInterval(() => {
      sendMinuteBilling();
    }, 60000);

    // First billing happens 180 seconds (3 minutes) after connection (after prepay period)
    const prepayPeriodMs = 180000; // 3 minutes in milliseconds
    const firstBillingTimeout = setTimeout(() => {
      sendMinuteBilling();
    }, prepayPeriodMs);

    return () => {
      if (billingIntervalRef.current) {
        clearInterval(billingIntervalRef.current);
        billingIntervalRef.current = null;
      }
      clearTimeout(firstBillingTimeout);
    };
  }, [enabled, connectionState, currentRoom, isHost]);

  // Stop billing when connection ends
  useEffect(() => {
    if (connectionState === 'disconnected' || connectionState === 'failed') {
      if (billingIntervalRef.current) {
        clearInterval(billingIntervalRef.current);
        billingIntervalRef.current = null;
      }
      retryAttemptedRef.current = false;
      callStartTimeRef.current = null;
    }
  }, [connectionState]);

  // Handle remote billing messages
  useEffect(() => {
    if (!webrtcClient) return;

    const handleBillingMessage = (message: BillingMessage) => {
      switch (message.type) {
        case 'billing_attempt':
          console.log(`[Billing] Remote attempting payment: ${message.amount} USDC`);
          break;
        case 'billing_success':
          console.log(`[Billing] Remote payment succeeded: ${message.txid}`);
          break;
        case 'billing_failed':
          console.warn(`[Billing] Remote payment failed: ${message.message}`);
          break;
        case 'billing_frozen':
          console.warn('[Billing] Remote video frozen');
          break;
        case 'billing_unfrozen':
          console.log('[Billing] Remote video unfrozen');
          break;
      }
    };

    webrtcClient.setBillingMessageHandler(handleBillingMessage);
  }, [webrtcClient]);
}

