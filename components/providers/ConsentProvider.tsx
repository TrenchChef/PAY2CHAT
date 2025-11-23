'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const CONSENT_STORAGE_KEY = 'pay2chat_consent_accepted';

interface ConsentContextType {
  consentGiven: boolean;
  setConsentGiven: (value: boolean) => void;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consentGiven, setConsentGivenState] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
    setConsentGivenState(stored);
  }, []);

  const setConsentGiven = (value: boolean) => {
    setConsentGivenState(value);
    localStorage.setItem(CONSENT_STORAGE_KEY, String(value));
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

