/**
 * Type definitions for simple-peer
 * These are minimal types based on the simple-peer API
 */

declare module 'simple-peer' {
  interface SimplePeerOptions {
    initiator?: boolean;
    channelConfig?: RTCDataChannelInit;
    channelName?: string;
    config?: RTCConfiguration;
    constraints?: MediaStreamConstraints;
    offerOptions?: RTCOfferOptions;
    answerOptions?: RTCAnswerOptions;
    sdpTransform?: (sdp: string) => string;
    stream?: MediaStream;
    trickle?: boolean;
    allowHalfTrickle?: boolean;
    iceTransportPolicy?: RTCIceTransportPolicy;
    bundlePolicy?: RTCBundlePolicy;
    rtcpMuxPolicy?: RTCRtcpMuxPolicy;
    reconnectTimer?: number;
    maxBufferedAmount?: number;
    objectMode?: boolean;
  }

  interface SignalData {
    type?: 'offer' | 'answer' | 'candidate';
    sdp?: string;
    candidate?: string;
    sdpMLineIndex?: number | null;
    sdpMid?: string | null;
    renegotiate?: boolean;
    transceiverRequest?: any;
  }

  class Peer extends EventTarget {
    constructor(opts?: SimplePeerOptions);
    
    // Properties
    readonly connected: boolean;
    readonly destroyed: boolean;
    readonly destroyed: boolean;
    readonly localAddress?: string;
    readonly localPort?: number;
    readonly remoteAddress?: string;
    readonly remotePort?: number;
    readonly remoteFamily?: string;

    // Methods
    signal(data: SignalData): void;
    send(data: string | Buffer | Uint8Array): void;
    destroy(error?: Error): void;
    addStream(stream: MediaStream): void;
    removeStream(stream: MediaStream): void;
    addTrack(track: MediaStreamTrack, stream: MediaStream): RTCRtpSender;
    removeTrack(sender: RTCRtpSender): void;
    replaceTrack(oldTrack: MediaStreamTrack, newTrack: MediaStreamTrack): Promise<void>;
    addTransceiver(kind: string | MediaStreamTrack, init?: RTCRtpTransceiverInit): RTCRtpTransceiver;

    // Events
    on(event: 'signal', listener: (data: SignalData) => void): this;
    on(event: 'connect', listener: () => void): this;
    on(event: 'data', listener: (data: Buffer | string) => void): this;
    on(event: 'stream', listener: (stream: MediaStream) => void): this;
    on(event: 'track', listener: (track: MediaStreamTrack, stream: MediaStream) => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;

    once(event: 'signal', listener: (data: SignalData) => void): this;
    once(event: 'connect', listener: () => void): this;
    once(event: 'data', listener: (data: Buffer | string) => void): this;
    once(event: 'stream', listener: (stream: MediaStream) => void): this;
    once(event: 'track', listener: (track: MediaStreamTrack, stream: MediaStream) => void): this;
    once(event: 'close', listener: () => void): this;
    once(event: 'error', listener: (error: Error) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;

    off(event: 'signal', listener: (data: SignalData) => void): this;
    off(event: 'connect', listener: () => void): this;
    off(event: 'data', listener: (data: Buffer | string) => void): this;
    off(event: 'stream', listener: (stream: MediaStream) => void): this;
    off(event: 'track', listener: (track: MediaStreamTrack, stream: MediaStream) => void): this;
    off(event: 'close', listener: () => void): this;
    off(event: 'error', listener: (error: Error) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
  }

  namespace Peer {
    type Instance = Peer;
    type SignalData = SignalData;
    type Options = SimplePeerOptions;
  }

  export = Peer;
}

