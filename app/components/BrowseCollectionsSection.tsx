import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useHeaderAnimation } from '~/components/HeaderAnimationContext';

export function BrowseCollectionsSection() {
  const { isHeaderVisible } = useHeaderAnimation();
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (sectionRef.current) {
      gsap.set(sectionRef.current, { filter: 'blur(10px)', y: 30, opacity: 0 });
      if (isHeaderVisible) {
        gsap.to(sectionRef.current, {
          filter: 'blur(0px)',
          y: 0,
          opacity: 1,
          duration: 0.8,
          delay: 1, // Start at the same time as the S25 collection button
          ease: 'power2.out',
        });
      }
    }
  }, [isHeaderVisible]);

  return (
    <section
      ref={sectionRef}
      className="w-full bg-black text-white rounded-t-2xl md:rounded-t-2xl flex flex-col items-start justify-start px-6 pt-6 relative"
      style={{
        minHeight: 'max(48vh, 300px)',
        marginTop: 'calc(-1 * var(--section-peek))',
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        zIndex: 2,
      } as React.CSSProperties}
    >
      <h2 className="text-2xl md:text-3xl font-medium mb-0">Browse Collections</h2>
      {/* You can add the rest of your collection content here */}
    </section>
  );
}
