import { useState, useEffect } from 'react';
import { safeLocalStorage } from '~/lib/utils';

export function useNewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (hasInitialized) return;
    const hasSubscribed = safeLocalStorage.getItem('newsletterSubscribed') === 'true';
    const hasDismissed = safeLocalStorage.getItem('newsletterDismissed') === 'true';
    if (!hasSubscribed && !hasDismissed) {
      const timer = setTimeout(() => setIsOpen(true), 3000);
      return () => clearTimeout(timer);
    }
    setHasInitialized(true);
  }, [hasInitialized]);

  const openPopup = () => setIsOpen(true);
  const closePopup = () => setIsOpen(false);

  return { isOpen, openPopup, closePopup };
} 