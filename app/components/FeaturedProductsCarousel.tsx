import React, { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { RecommendedProductFragment } from 'storefrontapi.generated';
import { Image } from '@shopify/hydrogen';
import { Link } from 'react-router';

interface FeaturedProductsCarouselProps {
  products: RecommendedProductFragment[];
}

export function FeaturedProductsCarousel({ products }: FeaturedProductsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, slidesToScroll: 1 });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section className="bg-white py-6">
      <div className="max-w-xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-medium mb-0 ml-4 text-black flex items-center gap-2">
          <span>Featured</span>
        </h2>
        <div className="relative mt-6">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {products.map((product) => (
                <div
                  className="min-w-0 flex-[0_0_100%] flex flex-col items-center justify-center"
                  key={product.id}
                >
                  <Link to={"/products/" + product.handle} className="block w-full">
                    {product.featuredImage && (
                      <Image
                        data={product.featuredImage}
                        className="w-full object-cover mb-4"
                        aspectRatio="3/4"
                        sizes="(min-width: 45em) 400px, 100vw"
                        alt={product.featuredImage.altText || product.title}
                      />
                    )}
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-black mb-1">{product.title}</h3>
                      <span className="block text-base font-mono text-black">
                        {product.priceRange.minVariantPrice.amount} {product.priceRange.minVariantPrice.currencyCode}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
          {/* Arrows */}
          <button
            className="absolute left-0 top-1/2 -translate-y-1/2 p-0 disabled:opacity-30"
            onClick={() => emblaApi && emblaApi.scrollPrev()}
            disabled={!canScrollPrev}
            aria-label="Previous product"
            type="button"
          >
            <svg width="24" height="24" fill="none" stroke="black" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 p-0 disabled:opacity-30"
            onClick={() => emblaApi && emblaApi.scrollNext()}
            disabled={!canScrollNext}
            aria-label="Next product"
            type="button"
          >
            <svg width="24" height="24" fill="none" stroke="black" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
} 