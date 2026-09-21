import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect, useMemo } from 'react';

export type HeaderColor = 'default' | 'black' | (string & {});

interface HeaderColorContextType {
  headerColor: HeaderColor;
  setHeaderColor: (color: HeaderColor) => void;
}

const HeaderColorContext = createContext<HeaderColorContextType | undefined>(undefined);

export function normalizeHeaderColor(color: HeaderColor): string {
  if (color === 'default') return '#ffffff';
  const lower = String(color).toLowerCase().trim();
  if (lower === 'white' || lower === '#fff' || lower === '#ffffff') return '#ffffff';
  if (lower === 'black' || lower === '#000' || lower === '#000000') return '#000000';
  return lower;
}

export function HeaderColorProvider({ children }: { children: ReactNode }) {
  const [headerColor, setHeaderColorState] = useState<HeaderColor>('default');
  const colorRef = useRef<HeaderColor>('default');
  colorRef.current = headerColor;

  // Guarded setter: no-op when the color is unchanged (comparing normalized
  // values, so 'default' vs 'white' vs '#fff' don't trigger useless animations).
  const setHeaderColor = useCallback((color: HeaderColor) => {
    if (normalizeHeaderColor(colorRef.current) === normalizeHeaderColor(color)) return;
    colorRef.current = color;
    setHeaderColorState(color);
  }, []);

  const value = useMemo(
    () => ({ headerColor, setHeaderColor }),
    [headerColor, setHeaderColor],
  );

  return (
    <HeaderColorContext.Provider value={value}>
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

/**
 * Single-winner scroll-spy for header color.
 *
 * Each homepage section calls this with its own ref + desired color.
 * The observer only fires when the section crosses the middle band of the
 * viewport (`rootMargin: -45% 0px -45% 0px`), so at most ONE section owns
 * the header color at a time — no more fighting/flicker between adjacent
 * sections with threshold 0.5 observers.
 *
 * Same-color transitions are already skipped by the guarded setter above.
 */
export function useHeaderColorSection(
  ref: React.RefObject<HTMLElement | null>,
  color: HeaderColor,
  enabled: boolean = true,
) {
  const { setHeaderColor } = useHeaderColor();
  const isActiveRef = useRef(false);
  const colorRef = useRef(color);
  colorRef.current = color;
  const setColorRef = useRef(setHeaderColor);
  setColorRef.current = setHeaderColor;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isActiveRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          setColorRef.current(colorRef.current);
        }
      },
      // Only the section occupying the viewport middle wins.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );

    observer.observe(el);
    return () => {
      isActiveRef.current = false;
      observer.disconnect();
    };
  }, [ref, enabled]);

  // If the desired color changes while this section is the active one
  // (e.g. hero slide change), push the new color without waiting for scroll.
  useEffect(() => {
    if (enabled && isActiveRef.current) {
      setHeaderColor(color);
    }
  }, [color, enabled, setHeaderColor]);
} 