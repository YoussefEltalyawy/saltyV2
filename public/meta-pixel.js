(function () {
  try {
    if (window.fbq) return;

    var meta = document.querySelector('meta[name="facebook-pixel-id"]');
    var id = meta ? meta.getAttribute('content') : null;
    if (!id) return;
    id = String(id).replace(/[^0-9]/g, '');
    if (!id) return;

    var fbq = function () {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, arguments);
      } else {
        fbq.queue.push(arguments);
      }
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    fbq.disablePushState = true;

    window.fbq = fbq;
    window._fbq = fbq;

    // Queue the initial calls here, before hydration. fbevents.js is loaded
    // later from React (after hydration) because it injects its own script
    // tags, which would otherwise break React hydration.
    fbq('set', 'autoConfig', false, id);
    fbq('init', id);
    fbq('track', 'PageView');

    window.__metaPixelInitializedId = id;
    window.__metaPixelPageViewKey = location.pathname;
  } catch {
    // ignore
  }
})();
