import { useState, useEffect } from 'react';
import { safeLocalStorage } from '~/lib/utils';

// Number of days before showing the popup again after dismissal
const DAYS_BEFORE_REAPPEAR = 3;

export function useNewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (hasInitialized) return;
    
    const hasSubscribed = safeLocalStorage.getItem('newsletterSubscribed') === 'true';
    
    // Check if dismissed and when
    const dismissedTimestamp = safeLocalStorage.getItem('newsletterDismissedAt');
    let shouldShowPopup = true;
    
    if (hasSubscribed) {
      // If subscribed, never show again
      shouldShowPopup = false;
    } else if (dismissedTimestamp) {
      // If dismissed, check if it's been more than DAYS_BEFORE_REAPPEAR days
      const dismissedDate = new Date(parseInt(dismissedTimestamp, 10));
      const currentDate = new Date();
      const daysSinceDismissed = Math.floor((currentDate.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only show if it's been at least DAYS_BEFORE_REAPPEAR days since dismissal
      shouldShowPopup = daysSinceDismissed >= DAYS_BEFORE_REAPPEAR;
    }
    
    if (shouldShowPopup) {
      const timer = setTimeout(() => setIsOpen(true), 3000);
      return () => clearTimeout(timer);
    }
    
    setHasInitialized(true);
  }, [hasInitialized]);

  const openPopup = () => setIsOpen(true);
  const closePopup = () => setIsOpen(false);

  return { isOpen, openPopup, closePopup };
} 