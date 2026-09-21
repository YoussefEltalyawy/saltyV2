import {
  useRef,
  useState,
  useEffect,
  Suspense,
  useMemo,
  useCallback,
} from 'react';
import gsap from 'gsap';
import { useHeaderColorSection } from '~/components/HeaderColorContext';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { Await, useRouteLoaderData } from 'react-router';
import type { RootLoader } from '~/root';
import CollectionsSkeleton from './CollectionsSkeleton';
import CollectionsList from './CollectionsList';

gsap.registerPlugin(ScrollToPlugin);

// Request a viewport-appropriate size from the Shopify CDN instead of the
// full-res original. Full-screen backgrounds at original resolution were the
// main decode/composite jank source (cached = smooth, uncached = laggy).
function getSizedImageUrl(url: string | undefined, width = 1600): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('width', String(width));
    return parsed.toString();
  } catch {
    return url;
  }
}

function preloadImage(url: string | undefined) {
  if (!url) return;
  const img = new Image();
  img.src = url;
  // Warm the decoder off the critical path; ignore failures.
  (img as any).decode?.()?.catch?.(() => {});
}

export function BrowseCollectionsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  // Single-winner scroll-spy (viewport middle band). Dark section -> white logo.
  useHeaderColorSection(sectionRef, 'default');
  const bg1Ref = useRef<HTMLDivElement>(null);
  const bg2Ref = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const data = useRouteLoaderData<RootLoader>('root');

  const [activeIndex, setActiveIndex] = useState(0);
  const [isSectionActive, setIsSectionActive] = useState(false);
  const [collectionImages, setCollectionImages] = useState<Record<string, any>>({});
  const [currentBackgroundImage, setCurrentBackgroundImage] = useState<string | null>(null);
  const activeLayerRef = useRef<number>(1);
  const lastImageRef = useRef<string | null>(null);
  const isUnlockingRef = useRef<boolean>(false);
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sync mirror of activeIndex so wheel/touch handlers compute the next index
  // synchronously instead of inside a setState updater (which batches and
  // made preventDefault decisions stale — the "sometimes laggy" input).
  const activeIndexRef = useRef(0);
  // Cooldown between slide steps so fast wheel ticks don't pile up killed
  // mid-flight tweens. Slightly shorter than the crossfade duration.
  const lastStepAtRef = useRef(0);

  // Helper to get a sized image URL for a handle
  const getImageUrl = useCallback((handle: string) => {
    const raw = collectionImages[handle]?.image?.url;
    return getSizedImageUrl(raw);
  }, [collectionImages]);

  const collections = useMemo(
    () => data?.browseCollections?.menu?.items || [],
    [data],
  );

  const fetchingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper function to extract handle from URL more robustly
  const extractHandle = (url: string): string | null => {
    if (!url) return null;

    try {
      // Find the collections segment
      const collectionsMatch = url.match(/\/collections\/([^\/\?#]+)/);
      if (collectionsMatch && collectionsMatch[1]) {
        return collectionsMatch[1].toLowerCase();
      }
    } catch (error) {
      console.error('Error extracting handle from URL:', url, error);
    }
    return null;
  };

  // Fetch all collection images in parallel on mount/collections change
  useEffect(() => {
    if (!isClient || !collections.length) return;

    collections.forEach((item) => {
      const handle = extractHandle(item.url || '');
      if (!handle || collectionImages[handle] || fetchingRef.current.has(handle)) return;

      fetchingRef.current.add(handle);

      // Use native fetch to allow parallel requests
      fetch(`/api/collection-image?handle=${encodeURIComponent(handle)}`)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch image for ${handle}`);
          return res.json();
        })
        .then((data: any) => {
          if (data) {
            setCollectionImages(prev => ({
              ...prev,
              [handle]: data
            }));

            // Warm the decoder with a viewport-sized image, not full-res.
            preloadImage(getSizedImageUrl(data.image?.url));
          }
        })
        .catch(err => {
          // Log and keep in fetching set to avoid infinite retries if desired,
          // or remove to allow retry. Here we keep it to be safe.
          console.error(`Error loading image for ${handle}:`, err);
        });
    });
  }, [isClient, collections, collectionImages]);

  // Preload the neighbour slides' backgrounds so stepping never waits on network.
  useEffect(() => {
    if (!collections.length) return;
    [activeIndex - 1, activeIndex + 1].forEach((idx) => {
      if (idx < 0 || idx >= collections.length) return;
      const item = collections[idx];
      const handle = extractHandle(item?.url || '');
      if (handle) preloadImage(getImageUrl(handle));
    });
  }, [activeIndex, collections, getImageUrl]);

  // Setup initial background for current active index
  useEffect(() => {
    if (!currentBackgroundImage && collections.length > 0) {
      const activeItem = collections[activeIndex];
      const handle = extractHandle(activeItem?.url || '') || activeItem?.title.toLowerCase().replace(/\s+/g, '-');
      if (handle) {
        const url = getImageUrl(handle);
        if (url) {
          setCurrentBackgroundImage(url);
          lastImageRef.current = url;
          if (bg1Ref.current) {
            gsap.set(bg1Ref.current, { 
              backgroundImage: `url(${url})`, 
              opacity: 1,
              zIndex: 1 
            });
          }
        }
      }
    }
  }, [collections, collectionImages, currentBackgroundImage, activeIndex]);

  // Background crossfade — kept short with overwrite so rapid steps don't
  // pile up killed mid-flight tweens (the stutter source).
  useEffect(() => {
    if (!collections.length || activeIndex >= collections.length) return;

    const activeItem = collections[activeIndex];
    const handle = extractHandle(activeItem.url || '') || activeItem.title.toLowerCase().replace(/\s+/g, '-');
    const newImageUrl = getImageUrl(handle);

    if (newImageUrl && newImageUrl !== lastImageRef.current) {
      const isFirstLayerActive = activeLayerRef.current === 1;
      const currentLayer = isFirstLayerActive ? bg1Ref.current : bg2Ref.current;
      const nextLayer = isFirstLayerActive ? bg2Ref.current : bg1Ref.current;

      if (nextLayer && currentLayer) {
        lastImageRef.current = newImageUrl;

        const show = () => {
          // Skip if we've already moved on to another image
          if (newImageUrl !== lastImageRef.current) return;

          // Set background and move to front
          gsap.set(nextLayer, {
            backgroundImage: `url("${newImageUrl}")`,
            zIndex: 1,
            opacity: 0,
          });
          gsap.set(currentLayer, { zIndex: 0 });

          // Crossfade the TOP layer in; hide the previous one only after the
          // top is visible so there's never a white/gap phase.
          gsap.to(nextLayer, {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out',
            overwrite: 'auto',
            onComplete: () => {
              gsap.set(currentLayer, { opacity: 0 });
              activeLayerRef.current = isFirstLayerActive ? 2 : 1;
              setCurrentBackgroundImage(newImageUrl);
            }
          });
        };

        // Neighbours are preloaded, so this is usually instant; only wait
        // on network when the image genuinely isn't cached yet.
        const img = new Image();
        let shown = false;
        const showOnce = () => {
          if (shown) return;
          shown = true;
          show();
        };
        img.onload = showOnce;
        img.onerror = showOnce;
        img.src = newImageUrl;
        // Cached images may never fire onload — show synchronously.
        if (img.complete && img.naturalWidth) showOnce();
      }
    }
  }, [activeIndex, collections, getImageUrl]);

  // Header color is owned by useHeaderColorSection above (single-winner).

  // Intersection observer for section activation
  useEffect(() => {
    const section = sectionRef.current;
    if (!isClient || !section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Don't re-lock if we are in the process of unlocking
        if (isUnlockingRef.current) return;
        
        // Lower threshold (0.7 instead of 0.9) to make it more responsive
        const isIntersecting = entry.isIntersecting && entry.intersectionRatio > 0.7;
        setIsSectionActive(isIntersecting);
      },
      { threshold: [0.7] },
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
      if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
    };
  }, [isClient]);

  // Lock body scroll when section is active
  useEffect(() => {
    if (!isClient) return;
    if (isSectionActive) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isClient, isSectionActive]);

  // Direction-aware unlock: 'up' returns to the previous section
  // (categories), 'down' continues to the footer.
  const releaseSectionLockAndScroll = (direction: 'up' | 'down') => {
    isUnlockingRef.current = true;
    setIsSectionActive(false);

    document.body.style.overflow = '';
    document.body.style.touchAction = '';

    const section = sectionRef.current;
    if (direction === 'up') {
      // Land on the previous section instead of jumping to page top.
      const target = section
        ? Math.max(0, section.offsetTop - window.innerHeight * 0.8)
        : 0;
      gsap.to(window, {
        scrollTo: target,
        duration: 0.8,
        ease: 'power2.inOut',
      });
    } else if (direction === 'down') {
      if (section) {
        const nextScrollPos = section.offsetTop + section.offsetHeight;
        gsap.to(window, {
          scrollTo: nextScrollPos,
          duration: 0.8,
          ease: 'power2.inOut',
        });
      }
    }

    // Reset the unlock flag after a delay that matches the animation
    if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
    unlockTimeoutRef.current = setTimeout(() => {
      isUnlockingRef.current = false;
    }, 800);
  };

  // Step to a collection index, keeping the sync ref in lock-step.
  const stepToIndex = useCallback((next: number) => {
    activeIndexRef.current = next;
    lastStepAtRef.current = performance.now();
    setActiveIndex(next);
  }, []);

  // Direct selection (list click): sync the ref too, but skip the cooldown.
  const selectIndex = useCallback((next: number) => {
    activeIndexRef.current = next;
    setActiveIndex(next);
  }, []);

  // Scroll handling for collections — decisions are computed synchronously
  // from refs (no setState-updater side effects), with a short cooldown so
  // high-frequency trackpad ticks step cleanly instead of piling up.
  useEffect(() => {
    if (!isClient || collections.length === 0) return;

    const STEP_COOLDOWN_MS = 450;

    const step = (direction: 'down' | 'up'): boolean => {
      const now = performance.now();
      if (now - lastStepAtRef.current < STEP_COOLDOWN_MS) return true; // swallow, still locked
      const current = activeIndexRef.current;
      if (direction === 'down') {
        if (current < collections.length - 1) {
          stepToIndex(current + 1);
          return true;
        }
        releaseSectionLockAndScroll('down');
        return true;
      } else {
        if (current > 0) {
          stepToIndex(current - 1);
          return true;
        }
        releaseSectionLockAndScroll('up');
        return true;
      }
    };

    const handleCollectionScroll = (event: WheelEvent) => {
      if (!isSectionActive || isUnlockingRef.current) return;
      // Ignore horizontal/trackpad noise; only intentional vertical scrolls step.
      if (Math.abs(event.deltaY) < 4 || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      const handled = step(event.deltaY > 0 ? 'down' : 'up');
      if (handled) event.preventDefault();
    };

    // Touch support for mobile
    let touchStartY: number | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      if (!isSectionActive) return;
      touchStartY = event.touches[0].clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (isSectionActive) {
        // Prevent default browser scrolling while the section is locked
        if (event.cancelable) event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!isSectionActive || isUnlockingRef.current || touchStartY === null) return;
      const touchEndY = event.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;

      // Increased sensitivity for intentional swipes
      if (Math.abs(deltaY) < 50) return;

      step(deltaY > 0 ? 'down' : 'up');
      touchStartY = null;
    };

    window.addEventListener('wheel', handleCollectionScroll, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleCollectionScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isClient, isSectionActive, collections.length, stepToIndex]);

  return (
    <section
      ref={sectionRef}
      className="w-full text-white flex flex-col items-start px-6 relative overflow-hidden"
      style={{
        minHeight: '85dvh',
        paddingTop: '1.5rem',
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        zIndex: 2,
        background: '#000000', // Base background color to prevent white flashes
      }}
    >
      {/* Background Layer 1 */}
      <div
        ref={bg1Ref}
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Background Layer 2 */}
      <div
        ref={bg2Ref}
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Static dim overlay (replaces per-layer filter: brightness, which
          forced a repaint of the full-screen image on every tween frame) */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ background: 'rgba(0, 0, 0, 0.2)', zIndex: 2 }}
      />

      {/* Fallback background */}
      <div
        className="absolute inset-0 w-full h-full transition-opacity duration-300"
        style={{
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          opacity: currentBackgroundImage ? 0 : 1,
          zIndex: 0
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full h-full flex flex-col">
        <h2 className="text-2xl md:text-3xl font-medium mb-0">
          Salty&apos;s Brand Journey
        </h2>
      </div>

      {/* Collections List */}
      <div
        className="absolute left-0 w-full px-6 z-10"
        style={{
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Suspense fallback={<CollectionsSkeleton />}>
          {data?.browseCollections && (
            <Await resolve={data.browseCollections}>
              {(browseCollections) => (
                <CollectionsList
                  menu={browseCollections?.menu}
                  activeIndex={activeIndex}
                  setActiveIndex={selectIndex}
                />
              )}
            </Await>
          )}
        </Suspense>
      </div>
    </section>
  );
}