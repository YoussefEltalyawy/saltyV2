import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useHeaderAnimation } from '~/components/HeaderAnimationContext';
import type { AnnouncementItem } from '~/lib/graphql/announcement';

const ROTATE_EVERY_MS = 5000;
// Must match the --out durations in app.css so the outgoing message
// unmounts exactly when its fade finishes.
const FADE_MS = 350;

/**
 * Dashboard-editable announcement bar (Shopify metaobjects, type
 * `announcement`). Fixed at the very top of the viewport, above the header.
 * Publishes its height as `--announcement-height` so the fixed header and
 * page padding sit exactly below it.
 */
export function AnnouncementBar({
  announcements,
}: {
  announcements: AnnouncementItem[];
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  // Entrance gating: the intro splash covers the bar on homepage loads, so
  // the slide-down only plays once the splash starts clearing
  // (isHeaderVisible). Other pages have no splash → enter on mount.
  // Falls back to entering after 6s no matter what.
  const [entered, setEntered] = useState(false);
  const { isHeaderVisible } = useHeaderAnimation();
  const location = useLocation();
  const isHomePage =
    location.pathname === '/' ||
    /^\/[a-zA-Z]{2}-[a-zA-Z]{2}\/?$/.test(location.pathname);
  const indexRef = useRef(0);
  const items = announcements ?? [];

  useEffect(() => {
    if (entered) return;
    if (isHeaderVisible || !isHomePage) {
      const timer = setTimeout(
        () => setEntered(true),
        isHomePage ? 250 : 0,
      );
      return () => clearTimeout(timer);
    }
    const fallback = setTimeout(() => setEntered(true), 6000);
    return () => clearTimeout(fallback);
  }, [entered, isHeaderVisible, isHomePage]);

  // Keep the CSS var in sync with the measured bar height (0 when hidden).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = barRef.current;
    if (!el || items.length === 0) {
      document.documentElement.style.setProperty(
        '--announcement-height',
        '0px',
      );
      return;
    }
    const update = () => {
      document.documentElement.style.setProperty(
        '--announcement-height',
        `${el.offsetHeight}px`,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty(
        '--announcement-height',
        '0px',
      );
    };
  }, [items.length]);

  // Rotate when the client adds more than one enabled announcement.
  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % items.length;
      setPrevIndex(indexRef.current);
      indexRef.current = next;
      setIndex(next);
    }, ROTATE_EVERY_MS);
    return () => clearInterval(timer);
  }, [items.length]);

  // Unmount the outgoing message once its fade-out finishes.
  useEffect(() => {
    if (prevIndex === null) return;
    const timer = setTimeout(() => setPrevIndex(null), FADE_MS);
    return () => clearTimeout(timer);
  }, [prevIndex, index]);

  if (items.length === 0) return null;
  const item = items[index % items.length];
  const prevItem =
    prevIndex !== null && prevIndex !== index
      ? items[prevIndex % items.length]
      : null;
  const linkTo = item.collectionHandle
    ? `/collections/${item.collectionHandle}`
    : null;

  const renderMessage = (entry: AnnouncementItem) => (
    <>
      {entry.message}
      {entry.linkLabel ? (
        <span className="announcement-link-label"> {entry.linkLabel}</span>
      ) : null}
    </>
  );

  return (
    <div
      ref={barRef}
      className={`announcement-bar${entered ? ' is-ready' : ''}`}
      role="region"
      aria-label="Announcements"
      style={{
        background: item.backgroundColor || '#000000',
        color: item.textColor || '#ffffff',
      }}
    >
      {linkTo ? (
        <NavLink
          to={linkTo}
          className="announcement-bar-link"
          aria-label={`${item.message}${item.linkLabel ? ` — ${item.linkLabel}` : ''}${item.collectionTitle ? ` (${item.collectionTitle})` : ''}`}
        >
          <span className="announcement-stack">
            {prevItem ? (
              <span
                key={`out-${prevItem.id}-${prevIndex}`}
                className="announcement-msg is-leaving"
                aria-hidden
              >
                {renderMessage(prevItem)}
              </span>
            ) : null}
            <span
              key={`in-${item.id}-${index}`}
              className="announcement-msg is-entering"
            >
              {renderMessage(item)}
            </span>
          </span>
        </NavLink>
      ) : (
        <span className="announcement-stack">
          {prevItem ? (
            <span
              key={`out-${prevItem.id}-${prevIndex}`}
              className="announcement-msg is-leaving"
              aria-hidden
            >
              {renderMessage(prevItem)}
            </span>
          ) : null}
          <span
            key={`in-${item.id}-${index}`}
            className="announcement-msg is-entering"
          >
            {renderMessage(item)}
          </span>
        </span>
      )}
    </div>
  );
}
