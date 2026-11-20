import { useEffect, useState } from 'react';

export type BundleQuote = {
  original: number;
  discounted: number;
  currency: string;
};

/**
 * Ask Shopify to price an exact bundle selection with its own discount rules
 * (BXGY, free gifts, automatic discounts, ...) and return the result. The
 * estimate stays on screen until the quote arrives or if the request fails.
 */
export function useBundleQuote(
  lines: Array<{ merchandiseId: string; quantity?: number }>,
  discountCode?: string,
  enabled = true,
): BundleQuote | null {
  const [quote, setQuote] = useState<BundleQuote | null>(null);
  const key = lines.map((line) => line.merchandiseId).join(',');

  useEffect(() => {
    if (!enabled || !lines.length) {
      setQuote(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/bundle-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lines, discountCode: discountCode ?? null }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data: any = await response.json();
        if (
          typeof data?.discounted === 'number' &&
          typeof data?.original === 'number' &&
          typeof data?.currency === 'string'
        ) {
          setQuote({
            original: data.original,
            discounted: data.discounted,
            currency: data.currency,
          });
        }
      } catch {
        // Offline or aborted — keep the estimate.
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `key` captures the variant IDs; `lines` is rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, discountCode, enabled]);

  return quote;
}
