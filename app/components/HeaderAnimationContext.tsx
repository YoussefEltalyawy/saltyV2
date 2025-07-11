import { createContext, useContext, useState, ReactNode } from 'react';

interface HeaderAnimationContextType {
  isHeaderVisible: boolean;
  setHeaderVisible: (visible: boolean) => void;
}

const HeaderAnimationContext = createContext<HeaderAnimationContextType | undefined>(undefined);

export function HeaderAnimationProvider({ children }: { children: ReactNode }) {
  const [isHeaderVisible, setHeaderVisible] = useState(false);

  return (
    <HeaderAnimationContext.Provider value={{ isHeaderVisible, setHeaderVisible }}>
      {children}
    </HeaderAnimationContext.Provider>
  );
}

export function useHeaderAnimation() {
  const context = useContext(HeaderAnimationContext);
  if (context === undefined) {
    throw new Error('useHeaderAnimation must be used within a HeaderAnimationProvider');
  }
  return context;
} 