import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

type AsideType = 'search' | 'cart' | 'mobile' | 'closed';
type AsideContextValue = {
  type: AsideType;
  open: (mode: AsideType) => void;
  close: () => void;
};

/**
 * A side bar component with Overlay
 * @example
 * ```jsx
 * <Aside type="search" heading="SEARCH">
 *  <input type="search" />
 *  ...
 * </Aside>
 * ```
 */
export function Aside({
  children,
  heading,
  type,
  animation = 'left', // 'left' or 'top'
  showHeader = true,
}: {
  children?: React.ReactNode;
  type: AsideType;
  heading: React.ReactNode;
  animation?: 'left' | 'top';
  showHeader?: boolean;
}) {
  const { type: activeType, close } = useAside();
  const expanded = type === activeType;
  const [exiting, setExiting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const asideRef = useRef<HTMLDivElement>(null);

  // Animate slide in/out with GSAP
  useGSAP(() => {
    const aside = asideRef.current;
    if (!aside) return;
    // Use gsap.context for scoping and cleanup
    const ctx = gsap.context(() => {
      if (animation === 'top') {
        if (expanded && !exiting) {
          gsap.fromTo(
            aside,
            { y: '-100%', force3D: true },
            { y: '0%', duration: 0.5, ease: 'power2.inOut', force3D: true, willChange: 'transform, opacity' }
          );
        } else if (exiting) {
          gsap.to(aside, {
            y: '-100%',
            duration: 0.5,
            ease: 'power2.inOut',
            force3D: true,
            willChange: 'transform, opacity',
          });
        } else {
          gsap.set(aside, { y: '-100%', force3D: true, willChange: 'transform, opacity' });
        }
      } else {
        // default: left
        if (expanded && !exiting) {
          gsap.fromTo(
            aside,
            { x: '-100%', force3D: true },
            { x: '0%', duration: 0.5, ease: 'power2.inOut', force3D: true, willChange: 'transform, opacity' }
          );
        } else if (exiting) {
          gsap.to(aside, {
            x: '-100%',
            duration: 0.5,
            ease: 'power2.inOut',
            force3D: true,
            willChange: 'transform, opacity',
          });
        } else {
          gsap.set(aside, { x: '-100%', force3D: true, willChange: 'transform, opacity' });
        }
      }
    }, aside);
    return () => ctx.revert();
  }, [expanded, exiting, animation]);

  useEffect(() => {
    if (!expanded && exiting) {
      // If not expanded and already exiting, do nothing
      return;
    }
    if (expanded) {
      setExiting(false);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [expanded]);

  function handleClose() {
    setExiting(true);
    timeoutRef.current = setTimeout(() => {
      setExiting(false);
      close();
    }, 500); // match GSAP duration
  }

  useEffect(() => {
    const abortController = new AbortController();
    if (expanded && !exiting) {
      document.addEventListener(
        'keydown',
        function handler(event: KeyboardEvent) {
          if (event.key === 'Escape') {
            handleClose();
          }
        },
        { signal: abortController.signal },
      );
    }
    return () => abortController.abort();
  }, [close, expanded, exiting]);

  // Layout for top animation (full width, top-0, left-0, h-auto)
  const asideClass =
    animation === 'top'
      ? 'fixed left-0 top-0 w-full max-w-full bg-white shadow-2xl z-50 flex flex-col'
      : 'fixed left-0 top-0 h-screen w-[var(--aside-width)] max-w-full bg-white shadow-2xl z-50 flex flex-col';

  return (
    <div
      aria-modal
      className={`fixed inset-0 z-40 bg-black/20 ${expanded ? 'block' : 'hidden'}`}
      role="dialog"
    >
      <button className="absolute inset-0 w-full h-full bg-transparent cursor-default z-40" onClick={handleClose} />
      <div
        ref={asideRef}
        className={asideClass}
        style={{ willChange: 'transform, opacity' }}
      >
        {showHeader ? (
          <header className="flex items-center border-b border-black h-[var(--header-height)] justify-between px-5">
            <h3 className="m-0">{heading}</h3>
            <button className="close reset font-bold opacity-80 w-5 hover:opacity-100" onClick={handleClose} aria-label="Close">
              &times;
            </button>
          </header>
        ) : (
          <button
            className="absolute top-4 right-6 text-3xl font-bold opacity-80 hover:opacity-100 z-50"
            onClick={handleClose}
            aria-label="Close"
            type="button"
          >
            &times;
          </button>
        )}
        <main className="m-4 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

const AsideContext = createContext<AsideContextValue | null>(null);

Aside.Provider = function AsideProvider({ children }: { children: ReactNode }) {
  const [type, setType] = useState<AsideType>('closed');

  return (
    <AsideContext.Provider
      value={{
        type,
        open: setType,
        close: () => setType('closed'),
      }}
    >
      {children}
    </AsideContext.Provider>
  );
};

export function useAside() {
  const aside = useContext(AsideContext);
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider');
  }
  return aside;
}
