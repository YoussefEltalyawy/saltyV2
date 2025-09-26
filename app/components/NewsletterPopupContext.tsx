import {createContext, useContext, useMemo, type ReactNode} from 'react';

interface NewsletterPopupControls {
  open: () => void;
  close: () => void;
}

const NewsletterPopupContext = createContext<NewsletterPopupControls | undefined>(
  undefined,
);

interface NewsletterPopupProviderProps {
  children: ReactNode;
  openPopup: () => void;
  closePopup: () => void;
}

export function NewsletterPopupProvider({
  children,
  openPopup,
  closePopup,
}: NewsletterPopupProviderProps) {
  const value = useMemo(
    () => ({
      open: openPopup,
      close: closePopup,
    }),
    [openPopup, closePopup],
  );

  return (
    <NewsletterPopupContext.Provider value={value}>
      {children}
    </NewsletterPopupContext.Provider>
  );
}

export function useNewsletterPopupControls(): NewsletterPopupControls {
  const context = useContext(NewsletterPopupContext);

  if (!context) {
    throw new Error(
      'useNewsletterPopupControls must be used within a NewsletterPopupProvider',
    );
  }

  return context;
}
