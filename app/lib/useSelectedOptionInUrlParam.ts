import { useEffect } from 'react';
import { mapSelectedProductOptionToObject } from '@shopify/hydrogen';

type SelectedOption = { name: string; value: string };

declare global {
  interface Window {
    __nativeHistoryReplaceState?: History['replaceState'];
  }
}

/**
 * Same behavior as Hydrogen's `useSelectedOptionInUrlParam`, but it writes the
 * URL with the native `history.replaceState` captured before Meta's fbevents
 * wrapped it. That keeps the default variant options in the URL without making
 * fbevents count the query-string change as an extra PageView.
 */
export function useSelectedOptionInUrlParamQuiet(
  selectedOptions?: SelectedOption[],
) {
  const optionsKey = JSON.stringify(selectedOptions);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const optionsSearchParams = new URLSearchParams(
      mapSelectedProductOptionToObject(selectedOptions || []),
    );
    const currentSearchParams = new URLSearchParams(window.location.search);
    const combinedSearchParams = new URLSearchParams({
      ...Object.fromEntries(currentSearchParams),
      ...Object.fromEntries(optionsSearchParams),
    });

    if (combinedSearchParams.size === 0) return;

    const replaceState =
      window.__nativeHistoryReplaceState ?? window.history.replaceState;

    replaceState.call(
      window.history,
      {},
      '',
      `${window.location.pathname}?${combinedSearchParams.toString()}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey]);
}
