import React, { useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useRouteLoaderData, useFetcher } from 'react-router';
import type { RootLoader } from '~/root';
import { Image } from '@shopify/hydrogen';
import { useHeaderColor } from '~/components/HeaderColorContext';

// Custom hook for fetching a collection image by handle
function useCollectionImage(handle: string | undefined) {
  const fetcher = useFetcher();
  useEffect(() => {
    if (handle && fetcher.state === 'idle' && !fetcher.data) {
      fetcher.load(`/api/collection-image?handle=${handle}`);
    }
  }, [handle, fetcher]);
  return fetcher.data?.image;
}

export function BrowseCategoriesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { setHeaderColor } = useHeaderColor();
  const data = useRouteLoaderData<RootLoader>('root');
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, slidesToScroll: 1, align: 'start' });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const categoriesMenu: any[] = useMemo(() => data?.browseCategories?.menu?.items || [], [data]);

  // Intersection observer to set header color back to white when categories section is in view
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

  useEffect(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    emblaApi.on('select', () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    });
    return () => {
      emblaApi.off('select', () => { });
    };
  }, [emblaApi]);

  return (
    <section ref={sectionRef} className="w-full bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="overflow-x-hidden relative">
          <div ref={emblaRef} className="overflow-x-hidden">
            <div className="flex gap-6">
              {categoriesMenu.map((item: any, idx: number) => {
                if (!item.url || !item.url.includes('/collections/')) return null;
                const handle = item.url.split('/collections/')[1];
                const imageData = useCollectionImage(handle);
                // Ensure the URL is always relative and not external
                let url = item.url;
                if (url.startsWith('http')) {
                  url = `/collections/${handle}`;
                } else if (!url.startsWith('/collections/')) {
                  url = `/collections/${handle}`;
                }
                return (
                  <div
                    key={item.id}
                    className="flex-[0_0_85%] md:flex-[0_0_60%] relative overflow-hidden shadow-lg"
                    style={{ minWidth: '85vw', maxWidth: '600px', aspectRatio: '4/5', marginRight: idx === categoriesMenu.length - 1 ? 0 : '-8vw' }}
                  >
                    {imageData && (
                      <Image
                        data={imageData}
                        className="w-full h-full object-cover"
                        aspectRatio="4/5"
                        sizes="(min-width: 45em) 500px, 85vw"
                        alt={imageData.altText || item.title}
                        loading={idx < 2 ? 'eager' : 'lazy'}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                      <div>
                        <h3 className="text-white text-2xl mb-1">{item.title}</h3>
                        <a
                          href={url}
                          className="text-white text-sm underline font-medium"
                          style={{ textDecorationThickness: 2 }}
                        >
                          Shop Now
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 