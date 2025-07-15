import React, { createContext, useContext, useState, ReactNode } from 'react';

export type HeaderColor = 'default' | 'black';

interface HeaderColorContextType {
  headerColor: HeaderColor;
  setHeaderColor: (color: HeaderColor) => void;
}

const HeaderColorContext = createContext<HeaderColorContextType | undefined>(undefined);

export function HeaderColorProvider({ children }: { children: ReactNode }) {
  const [headerColor, setHeaderColor] = useState<HeaderColor>('default');
  return (
    <HeaderColorContext.Provider value={{ headerColor, setHeaderColor }}>
      {children}
    </HeaderColorContext.Provider>
  );
}

export function useHeaderColor() {
  const context = useContext(HeaderColorContext);
  if (!context) {
    throw new Error('useHeaderColor must be used within a HeaderColorProvider');
  }
  return context;
} 