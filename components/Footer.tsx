'use client';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8 mb-6">
          <div>
            <h3 className="text-lg font-bold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="/legal/tos.html" 
                  className="text-text-muted hover:text-text transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a 
                  href="/legal/privacy.html" 
                  className="text-text-muted hover:text-text transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Built on Open Protocols</h3>
            <p className="text-text-muted text-sm">
              Powered by WebRTC, Solana, and X402. 
              All protocols are open source and decentralized.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">About</h3>
            <p className="text-text-muted text-sm">
              Fully serverless, peer-to-peer video chat with instant crypto payments. 
              No backend, no database, no cloud services.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-border text-center">
          <p className="text-text-muted text-sm">
            © {currentYear} X402 CHAT. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

