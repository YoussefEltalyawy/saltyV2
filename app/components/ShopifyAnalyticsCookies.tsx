import {useEffect, useRef} from 'react';

/**
 * Shopify's analytics cookies (`_shopify_y` / `_shopify_s`) are what tie a
 * browser to a visitor/session in Shopify's reports. Hydrogen's
 * `useShopifyCookies()` (inside `<Analytics.Provider>`) is supposed to set
 * them, but it derives the cookie `Domain` by intersecting the labels of the
 * storefront host with `consent.checkoutDomain`:
 *
 *   currentDomain = location.host
 *   // compare reversed labels of checkoutDomain and currentDomain by index
 *   currentDomain = <labels they happen to share>
 *
 * When the storefront is not served from the checkout domain or a subdomain of
 * it (custom domain, `*.myshopify.dev` preview, single label host, ...) the
 * intersection collapses to a meaningless label such as `com`, `myshopify` or
 * `flow-sweatpants`. The browser then rejects the cookie outright:
 *
 *   Cookie "_shopify_y" has been rejected for invalid domain. myshopify
 *
 * The same bogus domain is handed to Shopify's Customer Privacy API, which is
 * why `_tracking_consent` is rejected too.
 *
 * With no cookies stored, `document.cookie` is empty, so
 * `getClientBrowserParameters()` returns empty `uniqueToken` / `visitToken`
 * and every event Shopify receives is anonymous: sessions and visitors never
 * show up in Shopify analytics.
 *
 * This component stores the same cookies as *host-only* cookies (no `Domain`
 * attribute), which are always valid for the host serving the page. The
 * values come from the Customer Privacy API when it has already resolved them,
 * so they match the tokens Shopify issued for this visitor.
 */

const SHOPIFY_Y = '_shopify_y';
const SHOPIFY_S = '_shopify_s';
const TRACKING_CONSENT = '_tracking_consent';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const THIRTY_MINUTES_SECONDS = 60 * 30;

/**
 * Events dispatched by Shopify's Customer Privacy API. They fire once the
 * visitor's consent has been resolved, which is also the moment the tokens
 * issued by Shopify become available in `cachedToken`.
 */
const CONSENT_EVENTS = [
  'visitorConsentCollected',
  'consentTrackingApiLoaded',
  'trackingConsentAccepted',
  'trackingConsentDeclined',
  'analyticsConsentAccepted',
  'analyticsConsentDeclined',
  'marketingConsentAccepted',
  'marketingConsentDeclined',
  'firstPartyMarketingConsentAccepted',
  'firstPartyMarketingConsentDeclined',
  'preferencesConsentAccepted',
  'preferencesConsentDeclined',
  'thirdPartyMarketingConsentAccepted',
  'thirdPartyMarketingConsentDeclined',
];

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const prefix = `${name}=`;
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) {
      return part.slice(prefix.length);
    }
  }
  return '';
}

/**
 * Writes a cookie without a `Domain` attribute, so it is scoped to the exact
 * host that served the page. Never rejected, whatever the checkout domain is.
 */
function writeHostOnlyCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

function randomToken(): string {
  const cryptoObj =
    typeof crypto !== 'undefined'
      ? (crypto as Crypto & {randomUUID?: () => string})
      : undefined;

  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();

  const bytes = new Uint8Array(16);
  cryptoObj?.getRandomValues?.(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function getCustomerPrivacy() {
  return (
    window as unknown as {
      Shopify?: {
        customerPrivacy?: {
          cachedToken?: Record<string, string>;
          cachedConsent?: string;
        };
      };
    }
  ).Shopify?.customerPrivacy;
}

export function ShopifyAnalyticsCookies() {
  // Tokens we generated ourselves, so we know they may be replaced by the
  // tokens Shopify issued once the Customer Privacy API resolves.
  const placeholders = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      if (cancelled) return;

      const privacy = getCustomerPrivacy();
      const tokens = privacy?.cachedToken ?? {};

      const entries = [
        [SHOPIFY_Y, ONE_YEAR_SECONDS] as const,
        [SHOPIFY_S, THIRTY_MINUTES_SECONDS] as const,
      ];

      for (const [name, maxAge] of entries) {
        const issued = typeof tokens[name] === 'string' ? tokens[name] : '';
        const current = readCookie(name);

        if (current) {
          // We wrote a placeholder earlier and Shopify has since issued the
          // real token: swap it so the events we already sent stay attached to
          // the identity Shopify knows about.
          if (issued && current !== issued && placeholders.current.has(name)) {
            writeHostOnlyCookie(name, issued, maxAge);
            placeholders.current.delete(name);
          }
          continue;
        }

        if (issued) {
          writeHostOnlyCookie(name, issued, maxAge);
        } else {
          writeHostOnlyCookie(name, randomToken(), maxAge);
          placeholders.current.add(name);
        }
      }

      // The Customer Privacy API writes `_tracking_consent` scoped to the
      // checkout domain, which the browser rejects for the same reason. Keep a
      // host-only copy so the visitor's choice survives a reload.
      const consent = privacy?.cachedConsent;
      if (consent && readCookie(TRACKING_CONSENT) !== consent) {
        writeHostOnlyCookie(TRACKING_CONSENT, consent, ONE_YEAR_SECONDS);
      }
    };

    // Hydrogen tries to write the same cookies right after this component
    // mounts. Give it a tick first: when its `Domain` is valid we reuse its
    // cookie instead of adding a second one for the same host.
    const initial = window.setTimeout(sync, 0);

    for (const event of CONSENT_EVENTS) {
      document.addEventListener(event, sync);
    }

    // Catch the case where the Customer Privacy API resolves without
    // dispatching any of the events above.
    const poll = window.setInterval(sync, 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(poll);
      for (const event of CONSENT_EVENTS) {
        document.removeEventListener(event, sync);
      }
    };
  }, []);

  return null;
}
