import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { FooterQuery } from 'storefrontapi.generated';

interface CollectionsListProps {
  menu: FooterQuery['menu'];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

const CollectionsList: React.FC<CollectionsListProps> = ({ menu, activeIndex, setActiveIndex }) => {
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useGSAP(
    () => {
      if (!itemRefs.current.length) return;

      const validRefs = itemRefs.current.filter(Boolean);
      const ctx = gsap.context(() => {
        const tl = gsap.timeline();

        // Animate all items to inactive state
        tl.to(validRefs, {
          fontWeight: 400,
          scale: 1,
          color: '#FFFFFF',
          x: 0,
          duration: 0.25,
          ease: 'power2.out',
          stagger: 0.02,
        });

        // Animate the active item with more visible changes (no color or x shift)
        const activeItem = itemRefs.current[activeIndex];
        if (activeItem) {
          tl.to(activeItem, {
            fontWeight: 700,
            scale: 1.1, // Slightly larger
            color: '#FFFFFF', // Keep color unchanged
            x: 0, // No shift
            duration: 0.35,
            ease: 'power2.out',
          }, '-=0.1');
        }
      }, validRefs);
      return () => ctx.revert();
    },
    { dependencies: [activeIndex, menu] },
  );

  if (!menu) return null;

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
            <div
              key={item.id}
              ref={(el) => (itemRefs.current[index] = el)}
              className="text-lg font-[200] transition-colors cursor-pointer select-none"
              style={{
                transformOrigin: 'left center',
              }}
              onClick={() => isActive ? window.location.href = url : setActiveIndex(index)}
            >
              {item.title}
            </div>
          );
        })}
      </div>

      {/* Discover Button */}
      <div className="mt-6">
        <a
          href={activeUrl}
          className="flex items-center gap-2 w-fit py-1.5 px-0 text-base font-semibold text-white transition-colors hover:text-blue-300 focus:text-blue-400 outline-none border-none bg-transparent shadow-none rounded-none"
          style={{
            textDecoration: 'none',
            borderBottom: '2px solid #fff',
            width: 'fit-content',
            fontWeight: 500,
            fontSize: '1.1rem',
            letterSpacing: '0.01em',
          }}
        >
          <span className="text-base font-normal">Discover</span>
          <svg width="15" height="15" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>
    </>
  );
};

export default CollectionsList; 