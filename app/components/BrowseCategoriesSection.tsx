import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useRouteLoaderData, useFetcher } from 'react-router';
import type { RootLoader } from '~/root';
import { Image } from '@shopify/hydrogen';
import { useHeaderColor } from '~/components/HeaderColorContext';
import { ArrowLeft, ArrowRight } from 'lucide-react';

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
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    slidesToScroll: 1, 
    align: 'start',
    dragFree: true,
    containScroll: 'trimSnaps',
    breakpoints: {
      '(min-width: 768px)': { 
        slidesToScroll: 1,
        containScroll: 'trimSnaps'
      }
    }
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [totalSlides, setTotalSlides] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setTotalSlides(emblaApi.scrollSnapList().length);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    // Initialize
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    
    // Update on scroll
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);
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
      <div className="w-full max-w-full px-0 mx-auto relative overflow-visible">
        {/* Navigation Arrows - Hidden on mobile */}
        <button 
          onClick={scrollPrev}
          className={`hidden md:block absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors ${!canScrollPrev ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="Previous slide"
          disabled={!canScrollPrev}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <button 
          onClick={scrollNext}
          className={`hidden md:block absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors ${!canScrollNext ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="Next slide"
          disabled={!canScrollNext}
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        
        <div className="overflow-x-hidden relative w-full mb-0">
          <div ref={emblaRef} className="overflow-x-hidden">
            <div className="flex">
              {categoriesMenu.map((item: any, idx: number) => {
                if (!item.url || !item.url.includes('/collections/')) return null;
                const handle = item.url.split('/collections/')[1];
                const imageData = useCollectionImage(handle);
                let url = item.url;
                if (url.startsWith('http')) {
                  url = `/collections/${handle}`;
                } else if (!url.startsWith('/collections/')) {
                  url = `/collections/${handle}`;
                }
                return (
                  <div
                    key={item.id}
                    className="flex-[0_0_85%] md:flex-[0_0_33.333%] relative overflow-hidden pl-4 first:pl-0 md:pl-0"
                    style={{ aspectRatio: '4/5' }}
                  >
                    {imageData && (
                      <Image
                        data={imageData}
                        className="w-full h-full object-cover"
                        aspectRatio="4/5"
                        sizes="(min-width: 768px) 33vw, 100vw"
                        alt={imageData.altText || item.title}
                        loading={idx < 3 ? 'eager' : 'lazy'}
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
          
          {/* Pagination Bars - Full width with equal spacing */}
          <div className="hidden md:block w-full px-4 mt-4">
            <div className="flex justify-between w-full">
              {scrollSnaps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollTo(index)}
                  className={`h-1 transition-all duration-300 flex-1 mx-0.5 first:ml-0 last:mr-0 ${index === selectedIndex ? 'bg-black' : 'bg-gray-200'}`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 