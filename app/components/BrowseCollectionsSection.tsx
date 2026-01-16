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
import { useHeaderColor } from '~/components/HeaderColorContext';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { Await, NavLink, useRouteLoaderData, useFetcher } from 'react-router';
import type { RootLoader } from '~/root';
import type { FooterQuery } from 'storefrontapi.generated';
import { throttle } from 'lodash';
import CollectionsSkeleton from './CollectionsSkeleton';
import CollectionsList from './CollectionsList';

gsap.registerPlugin(ScrollToPlugin);

export function BrowseCollectionsSection() {
  const { isHeaderVisible } = useHeaderAnimation();
  const { setHeaderColor } = useHeaderColor();
  const sectionRef = useRef<HTMLDivElement>(null);
  const currentBgRef = useRef<HTMLDivElement>(null);
  const nextBgRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const data = useRouteLoaderData<RootLoader>('root');

  const [activeIndex, setActiveIndex] = useState(0);
  const [isSectionActive, setIsSectionActive] = useState(false);
  const [collectionImages, setCollectionImages] = useState<{ [key: string]: any }>({});
  const [currentBackgroundImage, setCurrentBackgroundImage] = useState<string | null>(null);
  const [nextBackgroundImage, setNextBackgroundImage] = useState<string | null>(null);

  const collections = useMemo(
    () => data?.browseCollections?.menu?.items || [],
    [data],
  );

  const imageFetcher = useFetcher();
  const fetchingRef = useRef<Set<string>>(new Set());
  const fetchQueueRef = useRef<string[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper function to extract handle from URL more robustly
  const extractHandle = (url: string): string | null => {
    if (!url || !url.includes('/collections/')) return null;

    try {
      // Remove query parameters and hash
      const cleanUrl = url.split('?')[0].split('#')[0];
      // Extract handle after /collections/
      const match = cleanUrl.match(/\/collections\/([^\/]+)/);
      if (match && match[1]) {
        // Remove trailing slash if present
        return match[1].replace(/\/$/, '');
      }
    } catch (error) {
      console.error('Error extracting handle from URL:', url, error);
    }
    return null;
  };

  // Fetch collection images sequentially to avoid overwriting
  useEffect(() => {
    if (!collections.length) return;

    // Extract all handles that need fetching
    const handlesToFetch: string[] = [];
    collections.forEach((item) => {
      if (!item.url) return;

      const handle = extractHandle(item.url);
      if (!handle) return;

      // Skip if already fetched or currently fetching
      if (collectionImages[handle] || fetchingRef.current.has(handle)) return;

      handlesToFetch.push(handle);
    });

    // Add to queue if not already there
    handlesToFetch.forEach(handle => {
      if (!fetchQueueRef.current.includes(handle)) {
        fetchQueueRef.current.push(handle);
      }
    });

    // Process queue sequentially
    const processQueue = async () => {
      if (fetchQueueRef.current.length === 0 || imageFetcher.state !== 'idle') {
        return;
      }

      const handle = fetchQueueRef.current.shift();
      if (!handle || fetchingRef.current.has(handle)) {
        // Process next item
        setTimeout(processQueue, 0);
        return;
      }

      fetchingRef.current.add(handle);
      imageFetcher.load(`/api/collection-image?handle=${encodeURIComponent(handle)}`);
    };

    // Start processing if fetcher is idle
    if (imageFetcher.state === 'idle' && fetchQueueRef.current.length > 0) {
      processQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collections, collectionImages, imageFetcher.state]);

  // Update collection images when fetched
  useEffect(() => {
    if (imageFetcher.data) {
      const handle = imageFetcher.data.handle;

      if (!handle) {
        console.warn('Collection image response missing handle');
        return;
      }

      // Remove from fetching set
      fetchingRef.current.delete(handle);

      // Store the data even if image is null (to prevent re-fetching)
      setCollectionImages(prev => ({
        ...prev,
        [handle]: imageFetcher.data
      }));

      // Set initial background if image exists
      if (imageFetcher.data.image?.url) {
        if (!currentBackgroundImage && activeIndex === 0) {
          const firstItem = collections[0];
          if (firstItem?.url) {
            const firstHandle = extractHandle(firstItem.url);
            if (handle === firstHandle) {
              setCurrentBackgroundImage(imageFetcher.data.image.url);
            }
          }
        }
      } else {
        // Log when collection exists but has no image (for debugging)
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Collection "${imageFetcher.data.title}" (handle: ${handle}) has no image`);
        }
      }

      // Process next item in queue
      if (fetchQueueRef.current.length > 0) {
        setTimeout(() => {
          const nextHandle = fetchQueueRef.current.shift();
          if (nextHandle && !fetchingRef.current.has(nextHandle)) {
            fetchingRef.current.add(nextHandle);
            imageFetcher.load(`/api/collection-image?handle=${encodeURIComponent(nextHandle)}`);
          }
        }, 100); // Small delay to avoid overwhelming the API
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFetcher.data, currentBackgroundImage, activeIndex, collections]);

  // Handle fetcher errors - track failed requests
  useEffect(() => {
    if (imageFetcher.state === 'idle' && imageFetcher.data === undefined) {
      // If we're idle but have no data and there are items in queue, 
      // it might indicate an error - process next item
      if (fetchQueueRef.current.length > 0) {
        const nextHandle = fetchQueueRef.current.shift();
        if (nextHandle && !fetchingRef.current.has(nextHandle)) {
          fetchingRef.current.add(nextHandle);
          imageFetcher.load(`/api/collection-image?handle=${encodeURIComponent(nextHandle)}`);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFetcher.state, imageFetcher.data]);

  // Smooth crossfade background animation
  useEffect(() => {
    if (!collections.length || activeIndex >= collections.length) return;

    const activeItem = collections[activeIndex];
    if (!activeItem?.url) return;

    const handle = extractHandle(activeItem.url) || activeItem.title.toLowerCase().replace(/\s+/g, '-');

    const collectionData = collectionImages[handle];
    const newImageUrl = collectionData?.image?.url;

    if (newImageUrl && newImageUrl !== currentBackgroundImage) {
      setNextBackgroundImage(newImageUrl);

      // Preload image for smooth transition
      const img = new Image();
      img.onload = () => {
        const ctx = gsap.context(() => {
          // Set up next background with same scale as current
          if (nextBgRef.current) {
            gsap.set(nextBgRef.current, {
              backgroundImage: `url(${newImageUrl})`,
              opacity: 0,
              scale: 1.05, // Match the current background scale
            });
          }

          // Simple crossfade animation - no scaling
          const tl = gsap.timeline({
            onComplete: () => {
              setCurrentBackgroundImage(newImageUrl);
              setNextBackgroundImage(null);
            }
          });

          // Only fade opacity, no scale changes
          tl.to(nextBgRef.current, {
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out',
          });
        });
        return () => ctx.revert();
      };
      img.src = newImageUrl;
    }
  }, [activeIndex, collections, collectionImages, currentBackgroundImage]);

  // Initial section animation
  // useGSAP(() => {
  //   if (sectionRef.current) {
  //     gsap.set(sectionRef.current, { y: 30, opacity: 0 });
  //     if (isHeaderVisible) {
  //       gsap.to(sectionRef.current, {
  //         y: 0,
  //         opacity: 1,
  //         duration: 0.8,
  //         delay: 1,
  //         ease: 'power2.out',
  //       });
  //     }
  //   }
  // }, [isHeaderVisible]);

  // Intersection observer to set header color back to white when collections section is in view
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeaderColor('default');
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [setHeaderColor]);

  // Intersection observer for section activation
  useEffect(() => {
    if (!isClient || !sectionRef.current) return;

    const section = sectionRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSectionActive(entry.isIntersecting && entry.intersectionRatio > 0.9);
      },
      { threshold: 0.9 },
    );

    observer.observe(section);

    return () => {
      observer.unobserve(section);
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

  // Replace releaseSectionLockAndScrollToHero with a direction-aware function
  const releaseSectionLockAndScroll = (direction: 'up' | 'down') => {
    setIsSectionActive(false);
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    if (direction === 'up') {
      // Scroll to hero (top)
      gsap.to(window, {
        scrollTo: 0,
        duration: 0.6,
        ease: 'power2.out',
      });
    } else if (direction === 'down') {
      // Scroll to next section below collections
      const section = sectionRef.current;
      if (section) {
        let next = section.nextElementSibling as HTMLElement | null;
        while (next && next.tagName.toLowerCase() !== 'section') {
          next = next.nextElementSibling as HTMLElement | null;
        }
        if (next) {
          gsap.to(window, {
            scrollTo: next.offsetTop,
            duration: 0.6,
            ease: 'power2.out',
          });
        }
      }
    }
  };

  // Scroll handling for collections
  useEffect(() => {
    if (!isClient || collections.length === 0) return;

    const handleCollectionScroll = throttle((event: WheelEvent) => {
      if (!isSectionActive) return;

      const scrollDirection = event.deltaY > 0 ? 'down' : 'up';
      let handled = false;
      let releaseLock: 'up' | 'down' | null = null;

      setActiveIndex((prevIndex) => {
        if (scrollDirection === 'down') {
          if (prevIndex < collections.length - 1) {
            handled = true;
            return prevIndex + 1;
          } else if (prevIndex === collections.length - 1) {
            releaseLock = 'down';
          }
        } else {
          if (prevIndex > 0) {
            handled = true;
            return prevIndex - 1;
          } else if (prevIndex === 0) {
            releaseLock = 'up';
          }
        }
        return prevIndex;
      });

      if (handled) {
        event.preventDefault();
      } else if (releaseLock) {
        event.preventDefault();
        releaseSectionLockAndScroll(releaseLock);
      }
    }, 150, { leading: true, trailing: false });

    // Touch support for mobile
    let touchStartY: number | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      if (!isSectionActive) return;
      touchStartY = event.touches[0].clientY;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!isSectionActive || touchStartY === null) return;
      const touchEndY = event.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      if (Math.abs(deltaY) < 30) return;

      const swipeDirection = deltaY > 0 ? 'down' : 'up';
      let handled = false;
      let releaseLock: 'up' | 'down' | null = null;

      setActiveIndex((prevIndex) => {
        if (swipeDirection === 'down') {
          if (prevIndex < collections.length - 1) {
            handled = true;
            return prevIndex + 1;
          } else if (prevIndex === collections.length - 1) {
            releaseLock = 'down';
          }
        } else {
          if (prevIndex > 0) {
            handled = true;
            return prevIndex - 1;
          } else if (prevIndex === 0) {
            releaseLock = 'up';
          }
        }
        return prevIndex;
      });

      if (handled) {
        event.preventDefault();
      } else if (releaseLock) {
        event.preventDefault();
        releaseSectionLockAndScroll(releaseLock);
      }
      touchStartY = null;
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
      className="w-full text-white flex flex-col items-start px-6 relative overflow-hidden"
      style={{
        minHeight: '85dvh',
        paddingTop: '1.5rem',
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        zIndex: 2,
      }}
    >
      {/* Current Background */}
      {currentBackgroundImage && (
        <div
          ref={currentBgRef}
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(${currentBackgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
            backgroundRepeat: 'no-repeat',
            filter: 'brightness(0.8)',
            transform: 'scale(1.05)',
            willChange: 'transform',
          }}
        />
      )}

      {/* Next Background for crossfade */}
      {nextBackgroundImage && (
        <div
          ref={nextBgRef}
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
            backgroundRepeat: 'no-repeat',
            filter: 'brightness(0.8)',
            transform: 'scale(1.05)',
            willChange: 'transform, opacity',
            opacity: 0,
          }}
        />
      )}

      {/* Fallback background */}
      {!currentBackgroundImage && (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 w-full h-full flex flex-col">
        <h2 className="text-2xl md:text-3xl font-medium mb-0">
          Collections
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