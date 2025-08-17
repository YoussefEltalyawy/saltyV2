import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useNonce } from '@shopify/hydrogen';

type MetaPixelProps = {
  pixelId: string;
};

declare global {
  interface Window {
    fbq?: (
      command: 'init' | 'track' | 'consent' | string,
      ...args: any[]
    ) => void;
    _fbq?: any;
  }
}

export function MetaPixel({ pixelId }: MetaPixelProps) {
  const nonce = useNonce();
  const location = useLocation();

  useEffect(() => {
    if (!pixelId) return;
    if (typeof window === 'undefined') return;

    if (!window.fbq) {
      // Meta Pixel base code with dynamic loader
      (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function () {
          (n as any).callMethod
            ? (n as any).callMethod.apply(n, arguments)
            : (n as any).queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        (n as any).push = (n as any);
        (n as any).loaded = true;
        (n as any).version = '2.0';
        (n as any).queue = [];
        t = b.createElement(e);
        t.async = true;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(
        window,
        document,
        'script',
        'https://connect.facebook.net/en_US/fbevents.js',
      );
    }
    // Always ensure pixel is initialized once script is there
    window.fbq?.('init', pixelId);
    window.fbq?.('track', 'PageView');
  }, [pixelId]);

  // Track SPA navigations as PageView
  useEffect(() => {
    if (!pixelId) return;
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  }, [pixelId, location.pathname, location.search]);

  return (
    <>
      {/* Noscript image fallback */}
      <noscript>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}

export function trackPixelEvent(
  eventName: string,
  params?: Record<string, any>,
) {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', eventName, params || {});
    }
  } catch (err) {
    // swallow
  }
}

export function generateEventId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  const arr = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  }
  // fallback simple hex
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}


