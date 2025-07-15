import React, { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { ProductItemFullFragment as ProductItemFragment } from 'storefrontapi.generated';
import { Image } from '@shopify/hydrogen';
import { Link } from 'react-router';
import { useHeaderColor } from '~/components/HeaderColorContext';
import { AddToCartButton } from '~/components/AddToCartButton';
import { getProductOptions } from '@shopify/hydrogen';
import { useAside } from '~/components/Aside';

interface FeaturedProductsCarouselProps {
  products: ProductItemFragment[];
}

type SelectedOptions = Record<string, string>;

function getInitialSelectedOptions(product: ProductItemFragment) {
  // Default to the first value for each option
  const options: SelectedOptions = {};
  product.options.forEach((option: any) => {
    if (option.optionValues.length > 0) {
      options[option.name.toLowerCase()] = option.optionValues[0].name;
    }
  });
  return options;
}

// Helper to get all variants for a product
function getAllVariants(product: ProductItemFragment) {
  // Use product.variants.nodes if available, otherwise fallback
  // @ts-ignore: variants may not be typed on ProductItemFragment
  return product.variants?.nodes || [...(product.adjacentVariants || []), product.selectedOrFirstAvailableVariant].filter(Boolean);
}

function findMatchingVariant(product: ProductItemFragment, selectedOptions: SelectedOptions) {
  const allVariants = getAllVariants(product);
  return allVariants.find((variant: any) => {
    if (!variant) return false;
    return variant.selectedOptions.every((opt: any) => selectedOptions[opt.name.toLowerCase()] === opt.value);
  });
}

export function FeaturedProductsCarousel({ products }: FeaturedProductsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, slidesToScroll: 1 });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const { setHeaderColor } = useHeaderColor();
  const { open } = useAside();

  // State: selected options per product id
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, SelectedOptions>>(() => {
    const initial: Record<string, SelectedOptions> = {};
    products.forEach((product) => {
      initial[product.id] = getInitialSelectedOptions(product);
    });
    return initial;
  });

  // Add after selectedOptionsMap state
  const [lastColorMap, setLastColorMap] = useState<Record<string, string>>({});

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

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeaderColor('black');
        } else {
          setHeaderColor('default');
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(section);
    return () => {
      observer.disconnect();
      setHeaderColor('default');
    };
  }, [setHeaderColor]);

  // Handler for selecting an option value
  function handleOptionChange(productId: string, optionName: string, value: string) {
    setSelectedOptionsMap((prev) => {
      const prevOptions = prev[productId] || {};
      // Normalize all keys to lowercase
      const normalizedOptions: SelectedOptions = {};
      Object.keys(prevOptions).forEach((k) => {
        normalizedOptions[k.toLowerCase()] = prevOptions[k];
      });
      const lowerOptionName = optionName.toLowerCase();
      let newOptions = { ...normalizedOptions, [lowerOptionName]: value };
      // If color changes, check size availability
      if (lowerOptionName === 'color') {
        setLastColorMap((last) => ({
          ...last,
          [productId]: value,
        }));
        // Find all available sizes for the new color
        const product = products.find((p) => p.id === productId);
        if (product) {
          const sizeOption = product.options.find(opt => opt.name.toLowerCase() === 'size');
          if (sizeOption) {
            // Find all variants for the new color
            const availableSizes = sizeOption.optionValues.filter(sizeValue => {
              return getAllVariants(product).some(variant =>
                variant &&
                variant.availableForSale &&
                variant.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'color' && opt.value === value) &&
                variant.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'size' && opt.value === sizeValue.name)
              );
            });
            // If the current size is not available for the new color, select the first available size
            if (!availableSizes.some(s => s.name === newOptions['size'])) {
              if (availableSizes.length > 0) {
                newOptions['size'] = availableSizes[0].name;
              }
            }
          }
        }
      }
      return {
        ...prev,
        [productId]: newOptions,
      };
    });
  }

  // Helper to get the image for the last selected color
  function getDisplayImage(product: ProductItemFragment) {
    const colorOption = product.options.find(opt => opt.name.toLowerCase() === 'color');
    let selectedColor = lastColorMap[product.id] || (colorOption && colorOption.optionValues[0]?.name);
    if (colorOption && selectedColor) {
      // Find a variant with this color
      const colorVariant = getAllVariants(product)
        .find(variant => variant && variant.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'color' && opt.value === selectedColor));
      if (colorVariant?.image) return colorVariant.image;
      // Swatch fallback
      const colorValue = colorOption.optionValues.find(v => v.name === selectedColor);
      const swatchUrl = colorValue?.swatch?.image?.previewImage?.url;
      if (swatchUrl) {
        return {
          __typename: 'Image' as const,
          id: product.id + '-swatch-' + selectedColor,
          url: swatchUrl,
          altText: product.title + ' - ' + selectedColor,
          width: 800,
          height: 1200,
        };
      }
    }
    // Fallback to product featured image
    return product.featuredImage;
  }

  return (
    <section ref={sectionRef} className="bg-white py-10">
      <div className="max-w-xl mx-auto">
        <h2 className="text-small font-medium mb-0 ml-4 text-black flex items-center gap-2">
          <span>FEATURED</span>
        </h2>
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {products.map((product, idx) => {
                const selectedOptions = selectedOptionsMap[product.id] || getInitialSelectedOptions(product);
                const productOptions = getProductOptions({ ...product, selectedOrFirstAvailableVariant: product.selectedOrFirstAvailableVariant });
                if (idx === 0) {
                  // For each product, log the true stock for every color and size
                  product.options.forEach((option: any) => {
                    if (option.name.toLowerCase() === 'color') {
                      option.optionValues.forEach((colorValue: any) => {
                        const color = colorValue.name;
                        // For each size, check if a variant exists and is available
                        const sizeOption = product.options.find(opt => opt.name.toLowerCase() === 'size');
                        if (sizeOption) {
                          sizeOption.optionValues.forEach((sizeValue: any) => {
                            const size = sizeValue.name;
                            const variant = getAllVariants(product).find((variant: any) =>
                              variant &&
                              variant.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'color' && opt.value === color) &&
                              variant.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'size' && opt.value === size)
                            );
                            const inStock = variant?.availableForSale;
                            if (inStock === undefined) {
                              console.log('[DEBUG] No matching variant found or availableForSale is undefined:', {
                                product: product.title,
                                color,
                                size,
                                variants: getAllVariants(product).map((v: any) => ({
                                  selectedOptions: v.selectedOptions,
                                  availableForSale: v.availableForSale,
                                  id: v.id,
                                })),
                                selectedOrFirstAvailableVariant: product.selectedOrFirstAvailableVariant && {
                                  selectedOptions: product.selectedOrFirstAvailableVariant.selectedOptions,
                                  availableForSale: product.selectedOrFirstAvailableVariant.availableForSale,
                                  id: product.selectedOrFirstAvailableVariant.id,
                                }
                              });
                            }
                            console.log(`[TRUE STOCK] Product: ${product.title}, Color: ${color}, Size: ${size}, In Stock: ${inStock}`);
                          });
                        }
                      });
                    }
                  });
                }
                const matchingVariant = findMatchingVariant(product, selectedOptions) || product.selectedOrFirstAvailableVariant;
                const displayImage = getDisplayImage(product);
                return (
                  <div
                    className="min-w-0 flex-[0_0_100%] flex flex-col items-center justify-center px-2"
                    key={product.id}
                  >
                    <Link to={"/products/" + product.handle} className="block w-full">
                      {displayImage && (
                        <Image
                          data={displayImage}
                          className="w-full object-cover mb-4 rounded-lg"
                          aspectRatio="3/4"
                          sizes="(min-width: 45em) 400px, 100vw"
                          alt={displayImage.altText || product.featuredImage?.altText || product.title}
                        />
                      )}
                      <div className="text-center">
                        <h3 className="text-lg text-black mb-1 uppercase tracking-tight font-medium">{product.title}</h3>
                        <span className="block text-base text-black mb-2">
                          {Math.round(Number(product.priceRange.minVariantPrice.amount))} {product.priceRange.minVariantPrice.currencyCode}
                        </span>
                      </div>
                    </Link>
                    {/* Variant selectors */}
                    <div className="w-full flex flex-col gap-4 items-center mb-4">
                      {productOptions.map((option: any) => {
                        const isColor = option.name.toLowerCase() === 'color';
                        const isSize = option.name.toLowerCase() === 'size';
                        return (
                          <div key={option.name} className={`flex ${isColor ? 'flex-row gap-3 justify-center' : 'flex-row gap-2 justify-center'}`}>
                            {option.optionValues.map((value: any) => {
                              const isSelected = selectedOptions[option.name.toLowerCase()] === value.name;
                              let isAvailable = value.available;
                              if (isSize) {
                                // Only available if a variant with the selected color and this size is available
                                const selectedColor = selectedOptions['color'];
                                isAvailable = getAllVariants(product).some((variant: any) =>
                                  variant &&
                                  variant.availableForSale &&
                                  variant.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'color' && opt.value === selectedColor) &&
                                  variant.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'size' && opt.value === value.name)
                                );
                              }
                              // Color circle only for color option
                              if (isColor && value.swatch?.color) {
                                return (
                                  <div className="relative inline-block" key={value.name}>
                                    <button
                                      type="button"
                                      className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all shadow-sm
                                        ${isSelected ? 'border-gray-900 ring-2 ring-gray-900' : 'border-gray-200'}
                                        ${!isAvailable ? 'opacity-30 cursor-not-allowed' : 'hover:ring-2 hover:ring-gray-900'}
                                      `}
                                      style={{ backgroundColor: value.swatch.color, borderWidth: '.5px' }}
                                      disabled={!isAvailable}
                                      aria-pressed={isSelected}
                                      onClick={() => handleOptionChange(product.id, option.name, value.name)}
                                    />
                                    {!isAvailable && (
                                      <span className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center justify-center">
                                        <span className="block w-4/5 h-0.5 bg-red-500 rounded rotate-45" style={{ position: 'absolute', left: '10%', top: '50%' }} />
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              // Size rectangle for size option
                              if (isSize) {
                                const selectedColor = selectedOptions['color'];
                                const isAvailableForColor = getAllVariants(product).some((variant: any) =>
                                  variant &&
                                  variant.availableForSale &&
                                  variant.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'color' && opt.value === selectedColor) &&
                                  variant.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'size' && opt.value === value.name)
                                );
                                console.log(`[UI STOCK] Product: ${product.title}, Color: ${selectedColor}, Size: ${value.name}, UI In Stock: ${isAvailableForColor}`);
                                return (
                                  <div className="relative inline-block" key={value.name}>
                                    <button
                                      type="button"
                                      className={`px-4 py-1 rounded-md border text-sm font-medium transition-all bg-white
                                        ${isSelected ? 'border-gray-900 ring-1 ring-gray-300 text-gray-900' : 'border-gray-300 text-gray-900'}
                                        ${!isAvailable ? 'opacity-30 cursor-not-allowed' : 'hover:border-gray-900'}
                                        min-w-[40px] text-center tracking-wide`
                                      }
                                      style={{ borderWidth: '1px' }}
                                      disabled={!isAvailable}
                                      aria-pressed={isSelected}
                                      onClick={() => handleOptionChange(product.id, option.name, value.name)}
                                    >
                                      {value.name}
                                    </button>
                                    {!isAvailable && (
                                      <span className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center justify-center">
                                        <span className="block w-4/5 h-0.5 bg-red-500 rounded rotate-45" style={{ position: 'absolute', left: '10%', top: '50%' }} />
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              // Fallback: show as simple minimal button
                              return (
                                <button
                                  key={value.name}
                                  type="button"
                                  className={`px-3 py-1 rounded-none border text-sm font-medium transition-all
                                    ${isSelected ? 'border-gray-900 ring-1 ring-gray-300' : 'border-gray-200'}
                                    ${!isAvailable ? 'opacity-30 cursor-not-allowed' : 'hover:border-gray-400'}
                                    bg-white text-black min-w-[36px]`
                                  }
                                  style={{ borderWidth: '1px' }}
                                  disabled={!isAvailable}
                                  aria-pressed={isSelected}
                                  onClick={() => handleOptionChange(product.id, option.name, value.name)}
                                >
                                  {value.name}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                    {/* Add to cart button */}
                    <AddToCartButton
                      disabled={!matchingVariant?.availableForSale}
                      lines={matchingVariant ? [{ merchandiseId: matchingVariant.id, quantity: 1, selectedVariant: matchingVariant }] : []}
                      onClick={() => open('cart')}
                    >
                      <span
                        className={
                          `block w-full text-center py-2 px-4 rounded-lg tracking-wide text-base transition-all duration-200 ` +
                          (matchingVariant?.availableForSale
                            ? 'border border-gray-900 text-gray-900 bg-white hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300'
                            : 'border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed')
                        }
                        style={{ letterSpacing: '0.02em', borderWidth: '1px' }}
                      >
                        {matchingVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
                      </span>
                    </AddToCartButton>
                  </div>
                );
              })}
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