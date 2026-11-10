import {HydratedRouter} from 'react-router/dom';
import {startTransition, StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';

// Capture the native history method before third-party scripts (Meta's
// fbevents) wrap it, so app code can update the URL without triggering an
// extra PageView.
window.__nativeHistoryReplaceState =
  window.history.replaceState.bind(window.history);

if (!window.location.origin.includes('webcache.googleusercontent.com')) {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
}
