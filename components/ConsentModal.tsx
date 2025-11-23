'use client';

import { useState } from 'react';
import { useConsent } from './providers/ConsentProvider';

export function ConsentModal() {
  const { consentGiven, setConsentGiven } = useConsent();
  const [ageChecked, setAgeChecked] = useState(false);
  const [tosChecked, setTosChecked] = useState(false);
  const [ppChecked, setPpChecked] = useState(false);
  const [responsibilityChecked, setResponsibilityChecked] = useState(false);

  if (consentGiven) return null;

  const allChecked = ageChecked && tosChecked && ppChecked && responsibilityChecked;

  const handleContinue = () => {
    if (allChecked) {
      setConsentGiven(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4 border border-border">
        <h2 className="text-2xl font-bold mb-4">Consent Required</h2>
        <p className="text-text-muted mb-6">
          Please confirm the following to continue:
        </p>

        <div className="space-y-4 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ageChecked}
              onChange={(e) => setAgeChecked(e.target.checked)}
              className="mt-1 w-4 h-4"
            />
            <span className="text-sm">
              I confirm I am 18 or older.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tosChecked}
              onChange={(e) => setTosChecked(e.target.checked)}
              className="mt-1 w-4 h-4"
            />
            <span className="text-sm">
              I accept the{' '}
              <a
                href="/legal/tos.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Terms of Service
              </a>
              .
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ppChecked}
              onChange={(e) => setPpChecked(e.target.checked)}
              className="mt-1 w-4 h-4"
            />
            <span className="text-sm">
              I accept the{' '}
              <a
                href="/legal/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={responsibilityChecked}
              onChange={(e) => setResponsibilityChecked(e.target.checked)}
              className="mt-1 w-4 h-4"
            />
            <span className="text-sm">
              You are solely responsible for your use of the platform and all
              on-chain transactions.
            </span>
          </label>
        </div>

        <button
          onClick={handleContinue}
          disabled={!allChecked}
          className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

