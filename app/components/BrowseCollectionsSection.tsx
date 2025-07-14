import {
  useRef,
  useState,
  useEffect,
  Suspense,
  useMemo,
} from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useHeaderAnimation } from '~/components/HeaderAnimationContext';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { Await, NavLink, useRouteLoaderData, useFetcher } from 'react-router';
import type { RootLoader } from '~/root';
import type { FooterQuery } from 'storefrontapi.generated';
import { throttle } from 'lodash';

// Register the necessary GSAP plugins
gsap.registerPlugin(ScrollToPlugin);

export function BrowseCollectionsSection() {
  const { isHeaderVisible } = useHeaderAnimation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const lastScrollY = useRef(0);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const data = useRouteLoaderData<RootLoader>('root');

  // State for the highlighted collection
  const [activeIndex, setActiveIndex] = useState(0);
  // ✨ State to track if the section is the active scroll area
  const [isSectionActive, setIsSectionActive] = useState(false);
  // ✨ State for collection images
  const [collectionImages, setCollectionImages] = useState<{ [key: string]: any }>({});
  const [currentBackgroundImage, setCurrentBackgroundImage] = useState<string | null>(null);
  const [nextBackgroundImage, setNextBackgroundImage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const collections = useMemo(
    () => data?.browseCollections?.menu?.items || [],
    [data],
  );

  // ✨ Fetcher for collection images
  const imageFetcher = useFetcher();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // ✨ Effect to fetch collection images for each menu item - load all images immediately
  useEffect(() => {
    if (!collections.length) return;

    // Load all collection images immediately for better experience
    const imagesToLoad = collections
      .filter(item => item.url && item.url.includes('/collections/'))
      .map(item => {
        const handle = item.url!.split('/collections/')[1];
        return { handle, item };
      })
      .filter(({ handle }) => !collectionImages[handle]);

    // Load images in parallel for better performance
    imagesToLoad.forEach(({ handle }) => {
      imageFetcher.load(`/api/collection-image?handle=${handle}`);
    });
  }, [collections, collectionImages]);

  // ✨ Effect to update collection images when fetched
  useEffect(() => {
    if (imageFetcher.data && imageFetcher.data.image) {
      const handle = imageFetcher.data.handle;
      setCollectionImages(prev => ({
        ...prev,
        [handle]: imageFetcher.data
      }));

      // Set the first loaded image as the initial background
      if (!currentBackgroundImage && activeIndex === 0) {
        const firstItem = collections[0];
        if (firstItem && firstItem.url && firstItem.url.includes('/collections/')) {
          const firstHandle = firstItem.url.split('/collections/')[1];
          if (handle === firstHandle) {
            setCurrentBackgroundImage(imageFetcher.data.image.url);
          }
        }
      }
    }
  }, [imageFetcher.data, currentBackgroundImage, activeIndex, collections]);

  // ✨ Effect to update background image when active collection changes
  useEffect(() => {
    if (!collections.length || activeIndex >= collections.length) return;

    const activeItem = collections[activeIndex];
    if (!activeItem?.url) return;

    const handle = activeItem.url.includes('/collections/')
      ? activeItem.url.split('/collections/')[1]
      : activeItem.title.toLowerCase().replace(/\s+/g, '-');

    const collectionData = collectionImages[handle];
    const newImageUrl = collectionData?.image?.url;

    if (newImageUrl && newImageUrl !== currentBackgroundImage && !isTransitioning) {
      // Kill any existing animations to prevent conflicts
      if (backgroundRef.current) {
        gsap.killTweensOf(backgroundRef.current);
      }

      // Preload the image for smooth transition
      const img = new Image();
      img.onload = () => {
        // Double-check we're still on the same collection
        if (activeIndex !== collections.findIndex(item => {
          const itemHandle = item.url?.includes('/collections/')
            ? item.url.split('/collections/')[1]
            : item.title.toLowerCase().replace(/\s+/g, '-');
          return itemHandle === handle;
        })) return;

        setNextBackgroundImage(newImageUrl);
        setIsTransitioning(true);

        // Hero-style blur animation with slide effect - only on background
        gsap.to(backgroundRef.current, {
          filter: 'blur(12px)',
          scale: 1.03,
          duration: 0.25,
          ease: 'power1.out',
          force3D: true,
          onComplete: () => {
            setCurrentBackgroundImage(newImageUrl);
            setNextBackgroundImage(null);
            gsap.to(backgroundRef.current, {
              filter: 'blur(0px)',
              scale: 1,
              duration: 0.35,
              ease: 'power2.out',
              force3D: true,
              onComplete: () => {
                setIsTransitioning(false);
              }
            });
          }
        });
      };
      img.src = newImageUrl;
    }
  }, [activeIndex, collections, collectionImages, currentBackgroundImage, isTransitioning]);

  // Effect for the initial section reveal animation
  useGSAP(() => {
    if (sectionRef.current) {
      gsap.set(sectionRef.current, { y: 30, opacity: 0 });
      if (isHeaderVisible) {
        gsap.to(sectionRef.current, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          delay: 1,
          ease: 'power2.out',
        });
      }
    }
  }, [isHeaderVisible]);

  // Effect for snapping the section into view on scroll
  useEffect(() => {
    if (!isClient) return;
    const handleSnapScroll = () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        if (isScrollingRef.current) return;
        const currentScrollY = window.scrollY;
        const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
        const sectionTop = sectionRef.current?.offsetTop || 0;
        const threshold = 100;
        if (Math.abs(currentScrollY - lastScrollY.current) < 20) return;
        const snapZoneStart = Math.max(0, sectionTop - threshold);
        const snapZoneEnd = sectionTop + threshold;
        if (
          direction === 'down' &&
          currentScrollY > threshold &&
          currentScrollY < snapZoneEnd
        ) {
          isScrollingRef.current = true;
          gsap.to(window, {
            scrollTo: sectionTop,
            duration: 0.6,
            ease: 'power2.out',
            onComplete: () => { setTimeout(() => { isScrollingRef.current = false; }, 100); return undefined; },
          });
        } else if (direction === 'up' && currentScrollY < snapZoneStart) {
          isScrollingRef.current = true;
          gsap.to(window, {
            scrollTo: 0,
            duration: 0.6,
            ease: 'power2.out',
            onComplete: () => { setTimeout(() => { isScrollingRef.current = false; }, 100); return undefined; },
          });
        }
        lastScrollY.current = currentScrollY;
      }, 50);
    };
    window.addEventListener('scroll', handleSnapScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleSnapScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [isClient]);

  // ✨ ROBUST SOLUTION: Use IntersectionObserver to detect when the section is active
  useEffect(() => {
    if (!isClient || !sectionRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Section is considered "active" for scroll hijacking when it's >90% visible.
        // This reliably means the snap animation has completed.
        setIsSectionActive(entry.isIntersecting && entry.intersectionRatio > 0.9);
      },
      { threshold: 0.9 },
    );

    observer.observe(sectionRef.current);

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [isClient]);

  // ✨ Lock body scroll when section is active
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

  // Helper to release section lock and scroll to hero
  const releaseSectionLockAndScrollToHero = () => {
    setIsSectionActive(false);
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    // Smooth scroll to top
    gsap.to(window, {
      scrollTo: 0,
      duration: 0.6,
      ease: 'power2.out',
    });
  };

  // ✨ Effect for handling the scroll inside the section, now driven by `isSectionActive`
  useEffect(() => {
    if (!isClient || collections.length === 0) return;

    const handleCollectionScroll = throttle((event: WheelEvent) => {
      // If the section is not the active element, do nothing.
      if (!isSectionActive) return;

      const scrollDirection = event.deltaY > 0 ? 'down' : 'up';
      let handled = false;
      let releaseLock = false;
      setActiveIndex((prevIndex) => {
        if (scrollDirection === 'down') {
          if (prevIndex < collections.length - 1) {
            handled = true;
            return prevIndex + 1;
          }
        } else { // 'up'
          if (prevIndex > 0) {
            handled = true;
            return prevIndex - 1;
          } else if (prevIndex === 0) {
            // Only scroll to hero section if already at the first collection
            releaseLock = true;
          }
        }
        return prevIndex;
      });
      if (handled) {
        event.preventDefault(); // Only prevent scroll if we handled the event
      } else if (releaseLock) {
        event.preventDefault();
        releaseSectionLockAndScrollToHero();
      }
    }, 150, { leading: true, trailing: false });

    // Touch swipe support for mobile
    let touchStartY: number | null = null;
    let touchEndY: number | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      if (!isSectionActive) return;
      touchStartY = event.touches[0].clientY;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!isSectionActive || touchStartY === null) return;
      touchEndY = event.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      if (Math.abs(deltaY) < 30) return; // Ignore small swipes
      const swipeDirection = deltaY > 0 ? 'down' : 'up';
      let handled = false;
      let releaseLock = false;
      setActiveIndex((prevIndex) => {
        if (swipeDirection === 'down') {
          if (prevIndex < collections.length - 1) {
            handled = true;
            return prevIndex + 1;
          }
        } else { // 'up'
          if (prevIndex > 0) {
            handled = true;
            return prevIndex - 1;
          } else if (prevIndex === 0) {
            // Only scroll to hero section if already at the first collection
            releaseLock = true;
          }
        }
        return prevIndex;
      });
      if (handled) {
        event.preventDefault(); // Only prevent scroll if we handled the event
      } else if (releaseLock) {
        event.preventDefault();
        releaseSectionLockAndScrollToHero();
      }
      touchStartY = null;
      touchEndY = null;
    };

    window.addEventListener('wheel', handleCollectionScroll, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleCollectionScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isClient, isSectionActive, collections.length]);

  return (
    <section
      ref={sectionRef}
      className="w-full text-white rounded-t-2xl flex flex-col items-start px-6 relative overflow-hidden"
      style={
        {
          minHeight: '85dvh',
          marginTop: 'calc(-1 * var(--section-peek))',
          paddingTop: '1.5rem',
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          zIndex: 2,
        } as React.CSSProperties
      }
    >
      {/* ✨ Dynamic Background Image */}
      {currentBackgroundImage ? (
        <div
          ref={backgroundRef}
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${currentBackgroundImage})`,
            backgroundPosition: 'center 30%',
            filter: 'brightness(0.4) contrast(1.1)',
            transform: 'scale(1.1)', // Slight zoom to prevent white edges
            willChange: 'filter, transform',
            // Mobile optimization
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            // Performance optimizations
            backfaceVisibility: 'hidden',
            perspective: '1000px',
            transformStyle: 'preserve-3d',
          }}
        />
      ) : (
        // Fallback gradient background
        <div
          ref={backgroundRef}
          className="absolute inset-0 w-full h-full"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            // Performance optimizations
            backfaceVisibility: 'hidden',
            perspective: '1000px',
            transformStyle: 'preserve-3d',
          }}
        />
      )}

      {/* ✨ Overlay for better text readability */}
      <div
        className="absolute inset-0 bg-black/30"
        style={{ willChange: 'opacity' }}
      />

      {/* Content */}
      <div className="relative z-10 w-full h-full flex flex-col">
        <h2 className="text-2xl md:text-3xl font-medium mb-0">
          Browse Collections
        </h2>
      </div>

      {/* Collections positioned at bottom with safe area support */}
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
                  setActiveIndex={setActiveIndex}
                />
              )}
            </Await>
          )}
        </Suspense>
      </div>
    </section>
  );
}

function CollectionsSkeleton() {
  return (
    <div className="flex flex-col gap-2 mt-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-6 bg-gray-800 animate-pulse rounded w-24"></div>
      ))}
    </div>
  );
}

function CollectionsList({
  menu,
  activeIndex,
  setActiveIndex,
}: {
  menu: FooterQuery['menu'];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}) {
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useGSAP(
    () => {
      if (!itemRefs.current.length) return;

      // Animate all items to the "inactive" state with hardware acceleration
      gsap.to(itemRefs.current, {
        fontWeight: 400,
        scale: 1,
        color: '#9CA3AF',
        x: 0,
        duration: 0.3,
        ease: 'power2.out',
        force3D: true,
        transformOrigin: 'left center',
      });

      // Animate the single active item to the "selected" state
      const activeItem = itemRefs.current[activeIndex];
      if (activeItem) {
        gsap.to(activeItem, {
          fontWeight: 700,
          scale: 1.1,
          color: '#FFFFFF',
          duration: 0.4,
          ease: 'power2.out',
          force3D: true,
          transformOrigin: 'left center',
        });
      }
    },
    { dependencies: [activeIndex, menu] },
  );

  if (!menu) return null;

  // Get the active collection's URL
  const activeItem = menu.items[activeIndex];
  let activeUrl = '';
  if (activeItem && activeItem.url) {
    activeUrl = activeItem.url.includes('/collections/')
      ? `/collections/${activeItem.url.split('/collections/')[1]}`
      : activeItem.url.startsWith('http')
        ? `/collections/${activeItem.title.toLowerCase().replace(/\s+/g, '-')}`
        : activeItem.url;
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {menu.items.map((item, index) => {
          if (!item.url) return null;
          const url = item.url.includes('/collections/')
            ? `/collections/${item.url.split('/collections/')[1]}`
            : item.url.startsWith('http')
              ? `/collections/${item.title.toLowerCase().replace(/\s+/g, '-')}`
              : item.url;
          const isActive = index === activeIndex;
          return (
            isActive ? (
              <NavLink
                key={item.id}
                ref={(el) => (itemRefs.current[index] = el)}
                to={url}
                className="text-lg font-[200] transition-colors"
                style={{
                  transformOrigin: 'left center',
                  willChange: 'transform, font-weight, color',
                }}
              >
                {item.title}
              </NavLink>
            ) : (
              <span
                key={item.id}
                className="text-lg font-[200] transition-colors cursor-pointer select-none"
                style={{
                  transformOrigin: 'left center',
                  willChange: 'transform, font-weight, color',
                }}
                onClick={() => setActiveIndex(index)}
              >
                {item.title}
              </span>
            )
          );
        })}
      </div>
      {/* Discover Button */}
      <div className="mt-6">
        <a
          href={activeUrl}
          className="flex items-center justify-between min-w-[180px] max-w-[200px] w-full shadow-lg py-1.5 pl-4 pr-4 text-base font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-white pointer-events-auto rounded-xl overflow-hidden backdrop-blur-md bg-white/10 border border-white/30"
          style={{
            boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
            position: 'relative',
          }}
        >
          <span className="text-center text-base relative text-white font-manrope font-normal">Discover</span>

          <svg width="15" height="15" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>

        </a>
      </div>
    </>
  );
}