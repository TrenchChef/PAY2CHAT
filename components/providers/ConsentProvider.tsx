'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const CONSENT_STORAGE_KEY = 'pay2chat_consent_accepted';
const DEPLOYMENT_VERSION_KEY = 'pay2chat_deployment_version';
// Use Vercel's commit SHA if available (Vercel automatically sets NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA during build)
// This ensures consent resets on each new deployment
// Fallback version for local development (update this manually if needed for testing)
// Note: NEXT_PUBLIC_* vars are replaced at build time by Next.js with actual values
const CURRENT_DEPLOYMENT_VERSION = 
  (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA as string | undefined) ||
  'dev-local';

interface ConsentContextType {
  consentGiven: boolean;
  setConsentGiven: (value: boolean) => void;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consentGiven, setConsentGivenState] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if deployment version has changed
    const storedVersion = localStorage.getItem(DEPLOYMENT_VERSION_KEY);
    const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
    
    // If version changed or no version exists, reset consent
    if (storedVersion !== CURRENT_DEPLOYMENT_VERSION) {
      localStorage.setItem(DEPLOYMENT_VERSION_KEY, CURRENT_DEPLOYMENT_VERSION);
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      setConsentGivenState(false);
    } else {
      setConsentGivenState(storedConsent);
    }
  }, []);

  const setConsentGiven = (value: boolean) => {
    setConsentGivenState(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONSENT_STORAGE_KEY, String(value));
      localStorage.setItem(DEPLOYMENT_VERSION_KEY, CURRENT_DEPLOYMENT_VERSION);
    }
  };

  return (
    <ConsentContext.Provider value={{ consentGiven, setConsentGiven }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (context === undefined) {
    throw new Error('useConsent must be used within ConsentProvider');
  }
  return context;
}

