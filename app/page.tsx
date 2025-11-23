'use client';

import { ActionScreen } from '@/components/ActionScreen';
import { NavBar } from '@/components/NavBar';
import { Footer } from '@/components/Footer';
import { useConsent } from '@/components/providers/ConsentProvider';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

export default function Home() {
  const { consentGiven } = useConsent();
  const router = useRouter();
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {consentGiven && (
        <>
          <NavBar />

          <main className="flex-1">
            {/* Hero Section */}
            <section id="top" className="container mx-auto px-4 py-16 text-center">
              <h1 className="text-5xl font-bold mb-6">
                Private P2P Video Chat with Crypto Payments
              </h1>
              <p className="text-xl text-text-muted mb-8 max-w-2xl mx-auto">
                Built on Solana. Wallet-to-wallet transactions settle in seconds.
                No backend, no database, no cloud services. All logic runs entirely in the browser.
              </p>
              <ActionScreen />
            </section>

            {/* Features Section */}
            <section id="features" className="container mx-auto px-4 py-16">
              <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-surface rounded-lg p-6 border border-border">
                  <div className="text-4xl mb-4">🔒</div>
                  <h3 className="text-xl font-bold mb-2">Fully Encrypted</h3>
                  <p className="text-text-muted">
                    End-to-end encrypted WebRTC connections. Your conversations stay private.
                  </p>
                </div>
                <div className="bg-surface rounded-lg p-6 border border-border">
                  <div className="text-4xl mb-4">⚡</div>
                  <h3 className="text-xl font-bold mb-2">Instant Payments</h3>
                  <p className="text-text-muted">
                    Solana USDC transfers settle in seconds. Automatic per-minute billing with X402.
                  </p>
                </div>
                <div className="bg-surface rounded-lg p-6 border border-border">
                  <div className="text-4xl mb-4">🌐</div>
                  <h3 className="text-xl font-bold mb-2">Serverless</h3>
                  <p className="text-text-muted">
                    No backend required. All logic runs in your browser. True peer-to-peer.
                  </p>
                </div>
                <div className="bg-surface rounded-lg p-6 border border-border">
                  <div className="text-4xl mb-4">📁</div>
                  <h3 className="text-xl font-bold mb-2">File Sales</h3>
                  <p className="text-text-muted">
                    Encrypted P2P file sales via WebRTC DataChannel. Sell files directly to callers.
                  </p>
                </div>
                <div className="bg-surface rounded-lg p-6 border border-border">
                  <div className="text-4xl mb-4">⏱️</div>
                  <h3 className="text-xl font-bold mb-2">Accurate Timekeeping</h3>
                  <p className="text-text-muted">
                    Real-time timer with precise billing. See exactly how much you're earning or spending.
                  </p>
                </div>
                <div className="bg-surface rounded-lg p-6 border border-border">
                  <div className="text-4xl mb-4">💸</div>
                  <h3 className="text-xl font-bold mb-2">Tips & Refills</h3>
                  <p className="text-text-muted">
                    Send tips during calls. Automatic refill prompts when balance runs low.
                  </p>
                </div>
              </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="bg-surface py-16">
              <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
                <div className="max-w-3xl mx-auto space-y-8">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-xl font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
                      <p className="text-text-muted">
                        Connect your Solana wallet (Phantom, Solflare, etc.) to get started.
                        Your wallet address is your identity.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-xl font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Create or Join a Room</h3>
                      <p className="text-text-muted">
                        Hosts set their per-minute rate and create a room. Invitees join with a room code or invite link.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-xl font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Prepay & Connect</h3>
                      <p className="text-text-muted">
                        Invitees prepay for the first 3 minutes. Once confirmed, the WebRTC connection is established.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-xl font-bold">
                      4
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Automatic Billing</h3>
                      <p className="text-text-muted">
                        X402 automatically charges per minute. Payments happen on-chain in real-time.
                        Timer shows elapsed time and next payment countdown.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-xl font-bold">
                      5
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">End Call & Review</h3>
                      <p className="text-text-muted">
                        Either party can end the call. View detailed receipts with minutes, tips, and file purchases.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Connect Now Section */}
            <section id="connect-now" className="container mx-auto px-4 py-16">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl font-bold mb-8">Connect Now</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-surface rounded-lg p-8 border border-border hover:border-primary transition-colors">
                    <div className="text-4xl mb-4">🎥</div>
                    <h3 className="text-2xl font-bold mb-2">Create Room</h3>
                    <p className="text-text-muted mb-6">
                      Set your rate. Get paid instantly by the minute.
                    </p>
                    <button
                      onClick={() => {
                        if (!publicKey) {
                          setVisible(true);
                          return;
                        }
                        router.push('/create');
                      }}
                      className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
                    >
                      Create Chat
                    </button>
                  </div>

                  <div className="bg-surface rounded-lg p-8 border border-border hover:border-secondary transition-colors">
                    <div className="text-4xl mb-4">👤+</div>
                    <h3 className="text-2xl font-bold mb-2">Join Room</h3>
                    <p className="text-text-muted mb-6">
                      Chat Instantly. Pay Instantly. No Bank Required.
                    </p>
                    <button
                      onClick={() => {
                        if (!publicKey) {
                          setVisible(true);
                          return;
                        }
                        router.push('/join');
                      }}
                      className="w-full py-3 bg-secondary hover:bg-secondary/80 text-white rounded-lg font-medium transition-colors"
                    >
                      Join Chat
                    </button>
                  </div>
                </div>
              </div>
            </section>

          </main>

          <Footer />
        </>
      )}
    </div>
  );
}

