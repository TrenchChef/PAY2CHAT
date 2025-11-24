'use client';

import { ConsentModal } from './ConsentModal';
import { AdBlockerModal } from './AdBlockerModal';
import { useAdBlocker } from './providers/AdBlockerProvider';

export function ConsentModalWrapper() {
  const { adBlockerDetected, isDismissed, isChecking } = useAdBlocker();
  
  // Show ad blocker modal first if detected and not dismissed
  // Only show consent modal if ad blocker check passes
  const showAdBlockerModal = adBlockerDetected && !isDismissed && !isChecking;
  const showConsentModal = !showAdBlockerModal;

  return (
    <>
      <AdBlockerModal />
      {showConsentModal && <ConsentModal />}
    </>
  );
}

