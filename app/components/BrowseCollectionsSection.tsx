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
import { Await, NavLink, useRouteLoaderData } from 'react-router';
import type { RootLoader } from '~/root';
import type { FooterQuery } from 'storefrontapi.generated';
import { throttle } from 'lodash';

// Register the necessary GSAP plugins
gsap.registerPlugin(ScrollToPlugin);

export function BrowseCollectionsSection() {
  const { isHeaderVisible } = useHeaderAnimation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const lastScrollY = useRef(0);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const data = useRouteLoaderData<RootLoader>('root');

  // State for the highlighted collection
  const [activeIndex, setActiveIndex] = useState(0);
  // ✨ State to track if the section is the active scroll area
  const [isSectionActive, setIsSectionActive] = useState(false);

  const collections = useMemo(
    () => data?.browseCollections?.menu?.items || [],
    [data],
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect for the initial section reveal animation
  useGSAP(() => {
    if (sectionRef.current) {
      gsap.set(sectionRef.current, { filter: 'blur(10px)', y: 30, opacity: 0 });
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

  // ✨ Effect for handling the scroll inside the section, now driven by `isSectionActive`
  useEffect(() => {
    if (!isClient || collections.length === 0) return;

    const handleCollectionScroll = throttle((event: WheelEvent) => {
      // If the section is not the active element, do nothing.
      if (!isSectionActive) return;

      const scrollDirection = event.deltaY > 0 ? 'down' : 'up';

      setActiveIndex((prevIndex) => {
        if (scrollDirection === 'down') {
          if (prevIndex < collections.length - 1) {
            event.preventDefault(); // Take control of scroll
            return prevIndex + 1;
          }
        } else { // 'up'
          if (prevIndex > 0) {
            event.preventDefault(); // Take control of scroll
            return prevIndex - 1;
          } else if (prevIndex === 0) {
            // Only scroll to hero section if already at the first collection
            // Allow the scroll event to bubble so the snap scroll effect triggers
            // Do not preventDefault here
          }
        }
        // If at the start/end, don't preventDefault, allowing user to scroll away
        return prevIndex;
      });
    }, 150, { leading: true, trailing: false });

    window.addEventListener('wheel', handleCollectionScroll, { passive: false });
    return () => window.removeEventListener('wheel', handleCollectionScroll);
  }, [isClient, isSectionActive, collections.length]);

  return (
    <section
      ref={sectionRef}
      className="w-full bg-black text-white rounded-t-2xl flex flex-col items-start justify-start px-6 relative"
      style={
        {
          minHeight: '86dvh',
          marginTop: 'calc(-1 * var(--section-peek))',
          paddingTop: '1.5rem',
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
              <CollectionsList
                menu={browseCollections?.menu}
                activeIndex={activeIndex}
              />
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

function CollectionsList({
  menu,
  activeIndex,
}: {
  menu: FooterQuery['menu'];
  activeIndex: number;
}) {
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useGSAP(
    () => {
      if (!itemRefs.current.length) return;

      // Animate all items to the "inactive" state
      gsap.to(itemRefs.current, {
        fontWeight: 400, // font-normal
        scale: 1,
        color: '#9CA3AF', // text-gray-400
        x: 0,
        duration: 0.4,
        ease: 'power2.out',
      });

      // Animate the single active item to the "selected" state
      const activeItem = itemRefs.current[activeIndex];
      if (activeItem) {
        gsap.to(activeItem, {
          fontWeight: 700, // font-semibold
          scale: 1.1,
          color: '#FFFFFF', // text-white
          duration: 0.5,
          ease: 'power2.out',
        });
      }
    },
    { dependencies: [activeIndex, menu] },
  );

  if (!menu) return null;

  return (
    <div className="flex flex-col gap-2">
      {menu.items.map((item, index) => {
        if (!item.url) return null;
        const url = item.url.includes('/collections/')
          ? `/collections/${item.url.split('/collections/')[1]}`
          : item.url.startsWith('http')
            ? `/collections/${item.title.toLowerCase().replace(/\s+/g, '-')}`
            : item.url;
        return (
          <NavLink
            key={item.id}
            ref={(el) => (itemRefs.current[index] = el)}
            to={url}
            className="text-2xl font-[200] transition-colors"
            style={{
              transformOrigin: 'left center',
              willChange: 'transform, font-weight, color',
            }}
          >
            {item.title}
          </NavLink>
        );
      })}
    </div>
  );
}