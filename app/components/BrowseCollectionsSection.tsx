import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useHeaderAnimation } from '~/components/HeaderAnimationContext';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

// Register the ScrollTo plugin
gsap.registerPlugin(ScrollToPlugin);

export function BrowseCollectionsSection() {
  const { isHeaderVisible } = useHeaderAnimation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const lastScrollY = useRef(0);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  useEffect(() => {
    if (!isClient) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const currentScrollY = window.scrollY;
      const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
      const sectionTop = sectionRef.current?.offsetTop || 0;
      const threshold = 50;

      if (direction === 'down' && currentScrollY > threshold && currentScrollY < sectionTop) {
        isScrollingRef.current = true;
        gsap.to(window, {
          scrollTo: sectionTop,
          duration: 1.5, // Increased duration for smoother feel
          ease: 'power2.inOut', // Gentler easing for natural motion
          onComplete: () => {
            isScrollingRef.current = false;
          },
        });
      } else if (direction === 'up' && currentScrollY < sectionTop - threshold) {
        isScrollingRef.current = true;
        gsap.to(window, {
          scrollTo: 0,
          duration: 1.5, // Matching duration for consistency
          ease: 'power2.inOut',
          onComplete: () => {
            isScrollingRef.current = false;
          },
        });
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isClient]);

  if (!isClient) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className="w-full bg-black text-white rounded-t-2xl md:rounded-t-2xl flex flex-col items-start justify-start px-6 relative"
      style={{
        minHeight: '87vh',
        marginTop: 'calc(-1 * var(--section-peek))',
        paddingTop: '1.5rem', // Ensures content starts below header
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        zIndex: 2,
      } as React.CSSProperties}
    >
      <h2 className="text-2xl md:text-3xl font-medium mb-0">Browse Collections</h2>
      {/* Additional content */}
    </section>
  );
}