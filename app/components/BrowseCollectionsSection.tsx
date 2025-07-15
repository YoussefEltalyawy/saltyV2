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
import CollectionsSkeleton from './CollectionsSkeleton';
import CollectionsList from './CollectionsList';

gsap.registerPlugin(ScrollToPlugin);

export function BrowseCollectionsSection() {
  const { isHeaderVisible } = useHeaderAnimation();
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

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch collection images
  useEffect(() => {
    if (!collections.length) return;

    collections.forEach((item) => {
      if (!item.url || !item.url.includes('/collections/')) return;

      const handle = item.url.split('/collections/')[1];
      if (!handle || collectionImages[handle]) return;

      imageFetcher.load(`/api/collection-image?handle=${handle}`);
    });
  }, [collections, collectionImages]);

  // Update collection images when fetched
  useEffect(() => {
    if (imageFetcher.data && imageFetcher.data.image) {
      const handle = imageFetcher.data.handle;
      setCollectionImages(prev => ({
        ...prev,
        [handle]: imageFetcher.data
      }));

      // Set initial background
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

  // Smooth crossfade background animation
  useEffect(() => {
    if (!collections.length || activeIndex >= collections.length) return;

    const activeItem = collections[activeIndex];
    if (!activeItem?.url) return;

    const handle = activeItem.url.includes('/collections/')
      ? activeItem.url.split('/collections/')[1]
      : activeItem.title.toLowerCase().replace(/\s+/g, '-');

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

  // Intersection observer for section activation
  useEffect(() => {
    if (!isClient || !sectionRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
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

  const releaseSectionLockAndScrollToHero = () => {
    setIsSectionActive(false);
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    gsap.to(window, {
      scrollTo: 0,
      duration: 0.6,
      ease: 'power2.out',
    });
  };

  // Scroll handling for collections
  useEffect(() => {
    if (!isClient || collections.length === 0) return;

    const handleCollectionScroll = throttle((event: WheelEvent) => {
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
        } else {
          if (prevIndex > 0) {
            handled = true;
            return prevIndex - 1;
          } else if (prevIndex === 0) {
            releaseLock = true;
          }
        }
        return prevIndex;
      });

      if (handled) {
        event.preventDefault();
      } else if (releaseLock) {
        event.preventDefault();
        releaseSectionLockAndScrollToHero();
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
      let releaseLock = false;

      setActiveIndex((prevIndex) => {
        if (swipeDirection === 'down') {
          if (prevIndex < collections.length - 1) {
            handled = true;
            return prevIndex + 1;
          }
        } else {
          if (prevIndex > 0) {
            handled = true;
            return prevIndex - 1;
          } else if (prevIndex === 0) {
            releaseLock = true;
          }
        }
        return prevIndex;
      });

      if (handled) {
        event.preventDefault();
      } else if (releaseLock) {
        event.preventDefault();
        releaseSectionLockAndScrollToHero();
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