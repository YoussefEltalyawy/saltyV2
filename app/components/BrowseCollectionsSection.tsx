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
  const unlockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to get image URL for a handle
  const getImageUrl = (handle: string) => {
    return collectionImages[handle]?.image?.url;
  };

  const collections = useMemo(
    () => data?.browseCollections?.menu?.items || [],
    [data],
  );

  const fetchingRef = useRef<Set<string>>(new Set());
  const collectionsRef = useRef<any[]>([]);

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

    // Track which collections we've already tried to fetch
    const attemptedHandles = new Set<string>();

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

            // Preload the image in browser cache
            if (data.image?.url) {
              const img = new Image();
              img.src = data.image.url;
            }
          }
        })
        .catch(err => {
          // Log and keep in fetching set to avoid infinite retries if desired, 
          // or remove to allow retry. Here we keep it to be safe.
          console.error(`Error loading image for ${handle}:`, err);
        })
        .finally(() => {
          // We don't remove from fetchingRef here because we don't want to re-fetch 
          // in the next cycle if setCollectionImages triggered it but it's not yet in the state
        });
    });
  }, [isClient, collections]);

  // Preload all images and put them in cache
  useEffect(() => {
    Object.values(collectionImages).forEach((data: any) => {
      const url = data?.image?.url;
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [collectionImages]);

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

  // Optimized background transition
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
        
        // Prepare next layer - use a new image object for preloading just in case
        const img = new Image();
        img.onload = () => {
          // Skip if this load finished but we've already moved on to another image
          if (newImageUrl !== lastImageRef.current) return;

          // Kill any existing animations on the layers
          gsap.killTweensOf([nextLayer, currentLayer]);
          
          // Set background and move to front
          gsap.set(nextLayer, { 
            backgroundImage: `url(${newImageUrl})`,
            zIndex: 1,
            opacity: 0,
            scale: 1.05
          });
          gsap.set(currentLayer, { zIndex: 0 });

          // Crossfade: Fade in the TOP layer (next), and ONLY fade out the bottom layer (current) after the top is visible
          // This prevents any "white/gap" phase where both layers are semi-transparent.
          gsap.to(nextLayer, {
            opacity: 1,
            duration: 0.8,
            ease: 'power2.inOut',
            onComplete: () => {
              // Now that nextLayer is fully visible, we can safely hide the previous one
              gsap.set(currentLayer, { opacity: 0 });
              activeLayerRef.current = isFirstLayerActive ? 2 : 1;
              setCurrentBackgroundImage(newImageUrl);
            }
          });
        };
        img.src = newImageUrl;
      }
    }
  }, [activeIndex, collections, collectionImages]);

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

  // Replace releaseSectionLockAndScrollToHero with a direction-aware function
  const releaseSectionLockAndScroll = (direction: 'up' | 'down') => {
    isUnlockingRef.current = true;
    setIsSectionActive(false);
    
    document.body.style.overflow = '';
    document.body.style.touchAction = '';

    // Scroll animation
    if (direction === 'up') {
      gsap.to(window, {
        scrollTo: 0,
        duration: 0.8,
        ease: 'power2.inOut',
      });
    } else if (direction === 'down') {
      const section = sectionRef.current;
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

    const handleTouchMove = (event: TouchEvent) => {
      if (isSectionActive) {
        // Prevent default browser scrolling while the section is locked
        if (event.cancelable) event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!isSectionActive || touchStartY === null) return;
      const touchEndY = event.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      
      // Increased sensitivity for intentional swipes
      if (Math.abs(deltaY) < 50) return;

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
        // No extra action needed, activeIndex update handles it
      } else if (releaseLock) {
        releaseSectionLockAndScroll(releaseLock);
      }
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
          filter: 'brightness(0.8)',
          transform: 'scale(1.05)',
          willChange: 'transform, opacity',
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
          filter: 'brightness(0.8)',
          transform: 'scale(1.05)',
          willChange: 'transform, opacity',
        }}
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