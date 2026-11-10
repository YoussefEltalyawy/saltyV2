import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useNonce } from '@shopify/hydrogen';

type MetaPixelProps = {
  pixelId: string;
  nonce?: string;
};

declare global {
  interface Window {
    fbq?: ((command: string, ...args: any[]) => void) & {
      queue?: any[];
      loaded?: boolean;
      version?: string;
      callMethod?: (...args: any[]) => void;
    };
    _fbq?: any;
    __metaPixelPageViewKey?: string;
    __metaPixelInitializedId?: string;
    __metaPixelFbeventsLoading?: boolean;
  }
}

/**
 * Installs the fbq stub only. This never touches the DOM, so it is safe to run
 * before React hydration; calls made through the stub are queued until
 * fbevents.js is loaded.
 */
export function installMetaPixelStub() {
  if (typeof window === 'undefined' || window.fbq) return;

  const queue: any[] = [];
  const fbq = function (...args: any[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      queue.push(args);
    }
  } as any;

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = queue;
  fbq.disablePushState = true;

  window.fbq = fbq;
  window._fbq = fbq;
}

/**
 * Loads fbevents.js. This must only run after hydration: fbevents injects its
 * own script tags, which would otherwise cause a React hydration mismatch and
 * make React replace the entire document.
 */
function loadFbevents(nonce?: string) {
  if (typeof window === 'undefined' || window.__metaPixelFbeventsLoading) {
    return;
  }
  window.__metaPixelFbeventsLoading = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';

  // Attach CSP nonce so modern browsers enforcing CSP don't block fbevents.js
  const scriptNonce =
    nonce ||
    document.querySelector('script[nonce]')?.getAttribute('nonce') ||
    (document.currentScript as HTMLScriptElement | null)?.nonce;
  if (scriptNonce) {
    script.setAttribute('nonce', scriptNonce);
    (script as any).nonce = scriptNonce;
  }

  document.head.appendChild(script);
}

export function MetaPixel({ pixelId, nonce: propNonce }: MetaPixelProps) {
  const hookNonce = useNonce();
  const nonce = propNonce || hookNonce;
  const location = useLocation();

  useEffect(() => {
    if (!pixelId || typeof window === 'undefined') return;

    installMetaPixelStub();
    loadFbevents(nonce);

    if (window.__metaPixelInitializedId !== pixelId) {
      // Opt out of automatic microdata scraping before init
      window.fbq?.('set', 'autoConfig', false, pixelId);
      window.fbq?.('init', pixelId);
      window.__metaPixelInitializedId = pixelId;
    }
  }, [pixelId, nonce]);

  // Track SPA route navigations as PageView so standard events on internal
  // pages (ViewContent, AddToCart) are attributed to the active page immediately.
  useEffect(() => {
    if (!pixelId || typeof window === 'undefined') return;

    const currentPath = location.pathname;
    // The head stub already fired the first PageView for the initial landing path.
    // If the path changed (or head stub never ran), fire PageView for this route.
    if (window.__metaPixelPageViewKey !== currentPath) {
      window.__metaPixelPageViewKey = currentPath;
      window.fbq?.('track', 'PageView');
    }
  }, [pixelId, location.pathname]);

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

const ISO_CURRENCY_CODE = /^[A-Z]{3}$/;

/**
 * Meta rejects events whose `currency` is not a 3-letter ISO 4217 code and logs
 * "Invalid parameter format for currency". Additionally, Meta requires `value`
 * and `currency` to be provided together; sending one without the other triggers
 * the same error. Normalize or drop invalid/unpaired values.
 */
function sanitizeMetaParams(params: Record<string, any>) {
  const clean: Record<string, any> = { ...params };

  let validCurrency: string | undefined;
  if (clean.currency != null) {
    const code =
      typeof clean.currency === 'string'
        ? clean.currency.trim().toUpperCase()
        : '';
    if (ISO_CURRENCY_CODE.test(code)) {
      validCurrency = code;
      clean.currency = code;
    } else {
      delete clean.currency;
    }
  }

  if (clean.value != null && typeof clean.value !== 'number') {
    const value = Number(clean.value);
    if (Number.isFinite(value)) {
      clean.value = value;
    } else {
      delete clean.value;
    }
  }

  // Meta pairing rule: value and currency must be provided together.
  // If either is missing, remove both to prevent "Invalid parameter format for currency".
  if (clean.value != null && !validCurrency) {
    delete clean.value;
  }
  if (clean.value == null && clean.currency != null) {
    delete clean.currency;
  }

  return clean;
}

export function trackPixelEvent(
  eventName: string,
  params?: Record<string, any>,
  eventId?: string,
) {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    if (typeof window.fbq !== 'function') {
      installMetaPixelStub();
    }
    if (typeof window.fbq !== 'function') {
      return;
    }
    const resolvedEventId = eventId || params?.eventID || params?.event_id;
    const cleanParams = params ? { ...params } : {};
    delete cleanParams.eventID;
    delete cleanParams.event_id;

    const safeParams = sanitizeMetaParams(cleanParams);
    if (resolvedEventId) {
      window.fbq('track', eventName, safeParams, { eventID: resolvedEventId });
    } else {
      window.fbq('track', eventName, safeParams);
    }
  } catch {
    // swallow
  }
}

export function generateEventId() {
  const cryptoObj =
    typeof crypto !== 'undefined'
      ? (crypto as Crypto & { randomUUID?: () => string })
      : undefined;

  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }

  const arr = new Uint8Array(16);
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(arr);
  }
  // fallback simple hex
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
