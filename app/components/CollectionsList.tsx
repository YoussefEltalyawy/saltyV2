import React from 'react';
import type { FooterQuery } from 'storefrontapi.generated';
import { useNavigate } from 'react-router';

interface CollectionsListProps {
  menu: FooterQuery['menu'];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

// Active-state styling is pure CSS (no GSAP). The old timeline reverted and
// re-animated every item on each step, which fought the background crossfade
// and read as lag during fast scrolling.
const CollectionsList: React.FC<CollectionsListProps> = ({ menu, activeIndex, setActiveIndex }) => {
  const navigate = useNavigate();

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
      <div className="flex flex-col gap-1.5">
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
              className="text-base cursor-pointer select-none transition-all duration-300 ease-out will-change-transform"
              style={{
                transformOrigin: 'left center',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                fontWeight: isActive ? 700 : 200,
                opacity: isActive ? 1 : 0.75,
                color: '#FFFFFF',
              }}
              onClick={() => isActive ? navigate(url) : setActiveIndex(index)}
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