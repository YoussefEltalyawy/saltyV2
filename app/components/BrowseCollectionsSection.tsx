import {useRef, useState, useEffect, Suspense} from 'react';
import gsap from 'gsap';
import {useGSAP} from '@gsap/react';
import {useHeaderAnimation} from '~/components/HeaderAnimationContext';
import {ScrollToPlugin} from 'gsap/ScrollToPlugin';
import {Await, NavLink, useRouteLoaderData} from 'react-router';
import type {RootLoader} from '~/root';
import type {FooterQuery} from 'storefrontapi.generated';

// Register the ScrollTo plugin
gsap.registerPlugin(ScrollToPlugin);

export function BrowseCollectionsSection() {
  const {isHeaderVisible} = useHeaderAnimation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const lastScrollY = useRef(0);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobileRef = useRef(false);
  const data = useRouteLoaderData<RootLoader>('root');

  useEffect(() => {
    setIsClient(true);
    // Detect mobile device
    isMobileRef.current =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
  }, []);

  useGSAP(() => {
    if (sectionRef.current) {
      gsap.set(sectionRef.current, {filter: 'blur(10px)', y: 30, opacity: 0});
      if (isHeaderVisible) {
        gsap.to(sectionRef.current, {
          filter: 'blur(0px)',
          y: 0,
          opacity: 1,
          duration: 0.8,
          delay: 1,
          ease: 'power2.out',
        });
      }
    }
  }, [isHeaderVisible]);

  useEffect(() => {
    if (!isClient) return;

    const handleScroll = () => {
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce scroll events
      scrollTimeoutRef.current = setTimeout(() => {
        if (isScrollingRef.current) return;

        const currentScrollY = window.scrollY;
        const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
        const sectionTop = sectionRef.current?.offsetTop || 0;

        // Use different thresholds for mobile vs desktop
        const threshold = isMobileRef.current ? 50 : 100;
        const scrollDistance = Math.abs(currentScrollY - lastScrollY.current);

        // Only trigger if user has scrolled a meaningful distance
        if (scrollDistance < 20) return;

        // Check if we're in the "snap zone" - the area where snapping should occur
        const snapZoneStart = Math.max(0, sectionTop - threshold);
        const snapZoneEnd = sectionTop + threshold;

        if (
          direction === 'down' &&
          currentScrollY > threshold &&
          currentScrollY < snapZoneEnd
        ) {
          // User is scrolling down and approaching the section
          isScrollingRef.current = true;
          gsap.to(window, {
            scrollTo: sectionTop,
            duration: 0.6,
            ease: 'power2.out',
            onComplete: () => {
              setTimeout(() => {
                isScrollingRef.current = false;
              }, 100); // Small delay to prevent immediate re-triggering
            },
          });
        } else if (direction === 'up' && currentScrollY < snapZoneStart) {
          // User is scrolling up and moving away from the section
          isScrollingRef.current = true;
          gsap.to(window, {
            scrollTo: 0,
            duration: 0.6,
            ease: 'power2.out',
            onComplete: () => {
              setTimeout(() => {
                isScrollingRef.current = false;
              }, 100); // Small delay to prevent immediate re-triggering
            },
          });
        }

        lastScrollY.current = currentScrollY;
      }, 50); // 50ms debounce
    };

    // Use passive event listener for better performance
    window.addEventListener('scroll', handleScroll, {passive: true});
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isClient]);

  if (!isClient) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className="w-full bg-black text-white rounded-t-2xl md:rounded-t-2xl flex flex-col items-start justify-start px-6 relative"
      style={
        {
          minHeight: '86dvh',
          marginTop: 'calc(-1 * var(--section-peek))',
          paddingTop: '1.5rem', // Ensures content starts below header
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          zIndex: 2,
        } as React.CSSProperties
      }
    >
      <h2 className="text-2xl md:text-3xl font-medium mb-0">
        Browse Collections
      </h2>
      <div className="mt-auto pb-8 w-full">
        <Suspense fallback={<CollectionsSkeleton />}>
          <Await resolve={data.browseCollections}>
            {(browseCollections) => (
              <CollectionsList menu={browseCollections?.menu} />
            )}
          </Await>
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

function CollectionsList({menu}: {menu: FooterQuery['menu']}) {
  if (!menu) return null;
  
  return (
    <div className="flex flex-col gap-2">
      {menu.items.map((item) => {
        if (!item.url) return null;
        
        // Format the URL to ensure it's an internal link to collections
        // Extract just the handle from the URL if it's a collection URL
        const url = item.url.includes('/collections/') 
          ? `/collections/${item.url.split('/collections/')[1]}` 
          : item.url.startsWith('http') 
            ? `/collections/${item.title.toLowerCase().replace(/\s+/g, '-')}` 
            : item.url;
        
        return (
          <NavLink 
            key={item.id}
            to={url}
            className="text-2xl font-normal hover:text-gray-300 transition-colors"
          >
            {item.title}
          </NavLink>
        );
      })}
    </div>
  );
}
