import useEmblaCarousel from 'embla-carousel-react';
import {Image} from '@shopify/hydrogen';
import type {
  ProductFragment,
  ProductVariantFragment,
} from 'storefrontapi.generated';
import {ChevronLeft, ChevronRight, X} from 'lucide-react';
import {useCallback, useEffect, useState, useMemo} from 'react';

interface ProductImageCarouselProps {
  product: ProductFragment;
  selectedVariant: ProductVariantFragment;
  allImages: Array<{
    id: string;
    url: string;
    altText: string | null;
    width: number;
    height: number;
  }>;
}

export function ProductImageCarousel({
  product,
  selectedVariant,
  allImages,
}: ProductImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    slidesToScroll: 1,
    dragFree: false,
    containScroll: 'trimSnaps',
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenEmblaRef, fullscreenEmblaApi] = useEmblaCarousel({
    loop: false,
    slidesToScroll: 1,
    dragFree: false,
    containScroll: 'trimSnaps',
  });
  const [fullscreenSelectedIndex, setFullscreenSelectedIndex] = useState(0);
  const [lastVariantId, setLastVariantId] = useState<string | null>(null);

  // Get all unique product images from variants
  const productImages = useMemo(() => {
    // Use allImages if provided, otherwise fallback to existing logic
    if (allImages && allImages.length > 0) {
      return allImages;
    }

    const images: Array<{
      id: string;
      url: string;
      altText: string | null;
      width: number;
      height: number;
    }> = [];

    // Add images from all variants - safely check for variants property
    const productWithVariants = product as ProductFragment;
    if (productWithVariants.variants?.nodes) {
      productWithVariants.variants.nodes.forEach((variant) => {
        if (
          variant.image &&
          variant.image.id &&
          variant.image.url &&
          variant.image.width &&
          variant.image.height
        ) {
          if (!images.find((img) => img.id === variant.image!.id)) {
            images.push({
              id: variant.image.id,
              url: variant.image.url,
              altText: variant.image.altText || null,
              width: variant.image.width,
              height: variant.image.height,
            });
          }
        }
      });
    }

    // Add adjacent variants images
    if (product.adjacentVariants) {
      product.adjacentVariants.forEach((variant) => {
        if (
          variant.image &&
          variant.image.id &&
          variant.image.url &&
          variant.image.width &&
          variant.image.height
        ) {
          if (!images.find((img) => img.id === variant.image!.id)) {
            images.push({
              id: variant.image.id,
              url: variant.image.url,
              altText: variant.image.altText || null,
              width: variant.image.width,
              height: variant.image.height,
            });
          }
        }
      });
    }

    // Add selected variant image if not already included
    if (
      selectedVariant.image &&
      selectedVariant.image.id &&
      selectedVariant.image.url &&
      selectedVariant.image.width &&
      selectedVariant.image.height
    ) {
      if (!images.find((img) => img.id === selectedVariant.image!.id)) {
        images.push({
          id: selectedVariant.image.id,
          url: selectedVariant.image.url,
          altText: selectedVariant.image.altText || null,
          width: selectedVariant.image.width,
          height: selectedVariant.image.height,
        });
      }
    }

    return images;
  }, [product, selectedVariant, allImages]);

  // Find the index of the current selected variant's image - only when variant actually changes
  useEffect(() => {
    if (selectedVariant.image && selectedVariant.id !== lastVariantId) {
      const index = productImages.findIndex(
        (img) => img.id === selectedVariant.image!.id,
      );
      if (index !== -1) {
        setSelectedIndex(index);
        setLastVariantId(selectedVariant.id);
        if (emblaApi) {
          emblaApi.scrollTo(index);
        }
      }
    }
  }, [
    selectedVariant.id,
    selectedVariant.image,
    productImages,
    emblaApi,
    lastVariantId,
  ]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const onFullscreenSelect = useCallback(() => {
    if (!fullscreenEmblaApi) return;
    setFullscreenSelectedIndex(fullscreenEmblaApi.selectedScrollSnap());
  }, [fullscreenEmblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!fullscreenEmblaApi) return;
    onFullscreenSelect();
    fullscreenEmblaApi.on('select', onFullscreenSelect);
    return () => {
      fullscreenEmblaApi.off('select', onFullscreenSelect);
    };
  }, [fullscreenEmblaApi, onFullscreenSelect]);

  const openFullscreen = useCallback(() => {
    setIsFullscreenOpen(true);
    setFullscreenSelectedIndex(selectedIndex);
    // Scroll to current image in fullscreen
    setTimeout(() => {
      if (fullscreenEmblaApi) {
        fullscreenEmblaApi.scrollTo(selectedIndex);
      }
    }, 100);
  }, [selectedIndex, fullscreenEmblaApi]);

  const closeFullscreen = useCallback(() => {
    setIsFullscreenOpen(false);
  }, []);

  // Handle keyboard events in fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreenOpen) return;

      switch (e.key) {
        case 'Escape':
          closeFullscreen();
          break;
        case 'ArrowLeft':
          if (fullscreenEmblaApi) {
            fullscreenEmblaApi.scrollPrev();
          }
          break;
        case 'ArrowRight':
          if (fullscreenEmblaApi) {
            fullscreenEmblaApi.scrollNext();
          }
          break;
      }
    };

    if (isFullscreenOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreenOpen, fullscreenEmblaApi, closeFullscreen]);

  if (productImages.length === 0) {
    return (
      <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center">
        <span className="text-gray-500">No images available</span>
      </div>
    );
  }

  return (
    <>
      {/* Main Carousel */}
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {productImages.map((image, index) => (
              <div key={image.id} className="min-w-0 flex-[0_0_100%] relative">
                <div className="cursor-pointer" onClick={openFullscreen}>
                  <Image
                    data={image}
                    className="w-full h-auto object-cover"
                    aspectRatio="3/4"
                    sizes="(min-width: 45em) 50vw, 100vw"
                    alt={
                      image.altText || `${product.title} - Image ${index + 1}`
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Position Indicator */}
        <div className="absolute bottom-4 left-4 text-black px-2 py-1 rounded text-sm">
          {selectedIndex + 1} of {productImages.length}
        </div>

        {/* Indicator Lines */}
        {productImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {productImages.map((_, index) => (
              <div
                key={index}
                className={`h-0.5 transition-all duration-300 ${
                  index === selectedIndex ? 'w-8 bg-black' : 'w-4 bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreenOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 z-10 p-2 bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all"
              onClick={closeFullscreen}
              aria-label="Close fullscreen"
            >
              <X size={24} className="text-white" />
            </button>

            {/* Fullscreen Carousel */}
            <div className="w-full h-full flex items-center justify-center px-4">
              <div
                className="overflow-hidden max-w-4xl max-h-full"
                ref={fullscreenEmblaRef}
              >
                <div className="flex">
                  {productImages.map((image, index) => (
                    <div
                      key={image.id}
                      className="min-w-0 flex-[0_0_100%] flex items-center justify-center"
                    >
                      <Image
                        data={image}
                        className="max-w-full max-h-full object-contain"
                        sizes="100vw"
                        alt={
                          image.altText ||
                          `${product.title} - Image ${index + 1}`
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fullscreen Navigation Arrows */}
            {productImages.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all"
                  onClick={() =>
                    fullscreenEmblaApi && fullscreenEmblaApi.scrollPrev()
                  }
                  aria-label="Previous image"
                >
                  <ChevronLeft size={24} className="text-white" />
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all"
                  onClick={() =>
                    fullscreenEmblaApi && fullscreenEmblaApi.scrollNext()
                  }
                  aria-label="Next image"
                >
                  <ChevronRight size={24} className="text-white" />
                </button>
              </>
            )}

            {/* Fullscreen Position Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm">
              {fullscreenSelectedIndex + 1} of {productImages.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
