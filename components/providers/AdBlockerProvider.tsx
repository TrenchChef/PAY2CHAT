'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const ADBLOCKER_DISMISSED_KEY = 'pay2chat_adblocker_dismissed';

interface AdBlockerContextType {
  adBlockerDetected: boolean;
  isChecking: boolean;
  recheckAdBlocker: () => void;
  dismissAdBlocker: () => void;
  isDismissed: boolean;
}

const AdBlockerContext = createContext<AdBlockerContextType | undefined>(undefined);

// Multiple detection methods for reliability
const detectAdBlocker = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    let detected = false;

    // Method 1: Check for common ad blocker variables (synchronous check)
    try {
      if ((window as any).uabp || (window as any).uab || (window as any).BlockAdBlock) {
        detected = true;
        resolve(true);
        return;
      }
    } catch (e) {
      // Ignore
    }

    // Method 2: Fake ad element detection (async check)
    try {
      const fakeAd = document.createElement('div');
      fakeAd.innerHTML = '&nbsp;';
      fakeAd.className = 'adsbox';
      fakeAd.style.position = 'absolute';
      fakeAd.style.left = '-9999px';
      fakeAd.style.height = '1px';
      fakeAd.style.width = '1px';
      document.body.appendChild(fakeAd);

      // Check if element was removed or hidden by ad blocker
      setTimeout(() => {
        const isHidden = fakeAd.offsetHeight === 0 || 
                        fakeAd.offsetWidth === 0 ||
                        !document.body.contains(fakeAd);
        
        if (isHidden) {
          detected = true;
        }
        
        if (document.body.contains(fakeAd)) {
          document.body.removeChild(fakeAd);
        }
        
        // Method 3: Check for ad-related class names
        if (!detected) {
          try {
            const testDiv = document.createElement('div');
            testDiv.className = 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links';
            testDiv.style.position = 'absolute';
            testDiv.style.left = '-9999px';
            testDiv.style.height = '1px';
            testDiv.style.width = '1px';
            document.body.appendChild(testDiv);
            
            setTimeout(() => {
              const styles = window.getComputedStyle(testDiv);
              if (styles && (styles.display === 'none' || styles.visibility === 'hidden' || !document.body.contains(testDiv))) {
                detected = true;
              }
              if (document.body.contains(testDiv)) {
                document.body.removeChild(testDiv);
              }
              resolve(detected);
            }, 50);
          } catch (e) {
            resolve(detected);
          }
        } else {
          resolve(true);
        }
      }, 100);
    } catch (e) {
      // If we can't create the element, ad blocker might be interfering
      resolve(true);
    }
  });
};

export function AdBlockerProvider({ children }: { children: ReactNode }) {
  const [adBlockerDetected, setAdBlockerDetected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  const checkAdBlocker = async () => {
    setIsChecking(true);
    const detected = await detectAdBlocker();
    setAdBlockerDetected(detected);
    setIsChecking(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if user previously dismissed
    const dismissed = localStorage.getItem(ADBLOCKER_DISMISSED_KEY) === 'true';
    setIsDismissed(dismissed);

    // Run initial detection
    checkAdBlocker();

    // Re-check periodically in case user disables ad blocker
    const interval = setInterval(() => {
      if (!dismissed) {
        checkAdBlocker();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const recheckAdBlocker = () => {
    checkAdBlocker();
  };

  const dismissAdBlocker = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADBLOCKER_DISMISSED_KEY, 'true');
    }
  };

  return (
    <AdBlockerContext.Provider
      value={{
        adBlockerDetected,
        isChecking,
        recheckAdBlocker,
        dismissAdBlocker,
        isDismissed,
      }}
    >
      {children}
    </AdBlockerContext.Provider>
  );
}

export function useAdBlocker() {
  const context = useContext(AdBlockerContext);
  if (context === undefined) {
    throw new Error('useAdBlocker must be used within AdBlockerProvider');
  }
  return context;
}

