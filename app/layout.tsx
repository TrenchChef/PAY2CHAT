import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/components/providers/WalletProvider';
import { ConsentProvider } from '@/components/providers/ConsentProvider';
import { ConsentModalWrapper } from '@/components/ConsentModalWrapper';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'X402 CHAT - Private P2P Video Chat with Crypto Payments',
  description: 'Encrypted WebRTC video chat with instant Solana micropayments',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <ConsentProvider>
          <WalletProvider>
            <ConsentModalWrapper />
            {children}
          </WalletProvider>
        </ConsentProvider>
      </body>
    </html>
  );
}

