import { create } from 'zustand';

export type BillingStatus = 'paid' | 'pending' | 'failed' | 'frozen';

interface CallState {
  isInCall: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'failed';
  elapsedTime: number; // seconds
  nextPaymentCountdown: number; // seconds
  billingStatus: BillingStatus;
  totalPaid: number; // USDC
  startCall: () => void;
  endCall: () => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setConnectionState: (state: CallState['connectionState']) => void;
  updateTimer: (elapsed: number, countdown: number) => void;
  setBillingStatus: (status: BillingStatus) => void;
  addPayment: (amount: number) => void;
}

export const useCallStore = create<CallState>((set) => ({
  isInCall: false,
  localStream: null,
  remoteStream: null,
  connectionState: 'disconnected',
  elapsedTime: 0,
  nextPaymentCountdown: 0,
  billingStatus: 'paid',
  totalPaid: 0,
  startCall: () => set({ isInCall: true, connectionState: 'connecting' }),
  endCall: () =>
    set({
      isInCall: false,
      localStream: null,
      remoteStream: null,
      connectionState: 'disconnected',
      elapsedTime: 0,
      nextPaymentCountdown: 0,
      billingStatus: 'paid',
      totalPaid: 0,
    }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setConnectionState: (state) => set({ connectionState: state }),
  updateTimer: (elapsed, countdown) =>
    set({ elapsedTime: elapsed, nextPaymentCountdown: countdown }),
  setBillingStatus: (status) => set({ billingStatus: status }),
  addPayment: (amount) => set((state) => ({ totalPaid: state.totalPaid + amount })),
}));

