import {useState, useRef, useEffect, useMemo} from 'react';
import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {ProductItemFullFragment} from 'storefrontapi.generated';
import {ProductPrice} from './ProductPrice';

function ColorSwatch({
  color,
  image,
  name,
  onClick,
  isSelected,
}: {
  color?: string;
  image?: string;
  name: string;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      className={`w-4 h-4 rounded- border mr-1 inline-block align-middle overflow-hidden ${isSelected ? 'ring-2 ring-offset-1 ring-gray-900' : 'border-gray-300'}`}
      style={{backgroundColor: color || 'transparent'}}
      title={name}
      aria-label={`Select color ${name}`}
    >
      {image && (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      )}
    </button>
  );
}

interface SwipeableProductCardProps {
  product: ProductItemFullFragment;
}

export function SwipeableProductCard({product}: SwipeableProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const allImages = product.images?.nodes || [];
  const featuredImage = product.featuredImage;

  const originalImages = [
    featuredImage,
    ...allImages.filter((img) => img.id !== featuredImage?.id),
  ].filter(Boolean);

  const images =
    originalImages.length > 1
      ? [
          originalImages[originalImages.length - 1],
          ...originalImages,
          originalImages[0],
        ]
      : originalImages;

  const colorOption = product.options?.find(
    (opt: ProductItemFullFragment['options'][number]) =>
      opt.name.toLowerCase() === 'color',
  );

  // Create a map of color names to their corresponding image IDs using firstSelectableVariant
  const colorToImageIdMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!colorOption) return map;

    colorOption.optionValues.forEach((optionValue: any) => {
      const variant = optionValue.firstSelectableVariant;
      if (variant?.image?.id) {
        map.set(optionValue.name, variant.image.id);
      }
    });

    return map;
  }, [colorOption]);
  

  // Create a map of image IDs to their indices in originalImages
  const imageIdToIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    originalImages.forEach((img, index) => {
      if (img?.id) {
        map.set(img.id, index);
      }
    });
    return map;
  }, [originalImages]);
  // Handle color swatch click
  const handleColorSwatchClick = (colorName: string) => {
    const imageId = colorToImageIdMap.get(colorName);
    if (imageId) {
      const imageIndex = imageIdToIndexMap.get(imageId);
      if (imageIndex !== undefined) {
        // Add 1 to account for the duplicate first image in the carousel
        const targetIndex = imageIndex + 1;
        setIsTransitioning(true);
        setCurrentImageIndex(targetIndex);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 300);
      }
    }
  };

  // Get currently displayed color based on image index
  const getCurrentColor = useMemo(() => {
    // Adjust for infinite loop (subtract 1)
    let actualIndex = currentImageIndex - 1;

    // Handle wrap-around for infinite loop
    if (actualIndex < 0) actualIndex = originalImages.length - 1;
    if (actualIndex >= originalImages.length) actualIndex = 0;

    const currentImage = originalImages[actualIndex];
    if (!currentImage?.id) return null;

    // Find which color corresponds to this image
    for (const [colorName, imageId] of colorToImageIdMap.entries()) {
      if (imageId === currentImage.id) {
        return colorName;
      }
    }
    return null;
  }, [currentImageIndex, originalImages, colorToImageIdMap]);

  const handleInfiniteTransition = (newIndex: number) => {
    if (originalImages.length <= 1) return;

    setIsTransitioning(true);
    setCurrentImageIndex(newIndex);

    setTimeout(() => {
      if (newIndex === 0) {
        setCurrentImageIndex(originalImages.length);
      } else if (newIndex === images.length - 1) {
        setCurrentImageIndex(1);
      }
      setIsTransitioning(false);
    }, 300);
  };

  const handleStart = (clientX: number) => {
    if (originalImages.length <= 1) return;
    setIsDragging(true);
    setStartX(clientX);
    setCurrentX(clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || originalImages.length <= 1) return;
    const deltaX = clientX - startX;
    setCurrentX(clientX);
    setTranslateX(deltaX);
  };

  const handleEnd = () => {
    if (!isDragging || originalImages.length <= 1) return;

    const deltaX = currentX - startX;
    const threshold = 50;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        const newIndex = currentImageIndex - 1;
        handleInfiniteTransition(newIndex);
      } else {
        const newIndex = currentImageIndex + 1;
        handleInfiniteTransition(newIndex);
      }
    }

    setIsDragging(false);
    setTranslateX(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleMouseLeave = () => {
    handleEnd();
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove as any);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, currentX, startX]);

  return (
    <Link
      className="block bg-white transition-shadow group"
      to={`/products/${product.handle}`}
      prefetch="intent"
    >
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        style={{cursor: images.length > 1 ? 'grab' : 'pointer'}}
      >
        <div
          className={`flex ${isTransitioning ? 'transition-transform duration-300 ease-out' : ''}`}
          style={{
            transform: `translateX(${-currentImageIndex * 100 + (isDragging ? (translateX / (containerRef.current?.offsetWidth || 1)) * 100 : 0)}%)`,
          }}
        >
          {images.map((image, index) => (
            <div
              key={`${image?.id || 'img'}-${index}`}
              className="w-full flex-shrink-0"
            >
              <Image
                alt={image?.altText || product.title}
                aspectRatio="3/4"
                data={image}
                loading="lazy"
                sizes="(min-width: 45em) 400px, 100vw"
                className="w-full h-auto mb-2 object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1 ml-2">
        <h4 className="text-sm text-gray-900 group-hover:underline truncate">
          {product.title}
        </h4>
        <p className="text-[13px]">
          {product.selectedOrFirstAvailableVariant ? (
            <ProductPrice
              price={product.selectedOrFirstAvailableVariant.price}
              compareAtPrice={
                product.selectedOrFirstAvailableVariant.compareAtPrice
              }
              size={'sm'}
            />
          ) : (
            <span>
              <Money data={product.priceRange.minVariantPrice} />
            </span>
          )}
        </p>
        {colorOption && (
          <div className="flex items-center mt-1">
            {colorOption.optionValues.map((value: any) => {
              const isSelected = getCurrentColor === value.name;
              return (
                <ColorSwatch
                  key={value.name}
                  color={value.swatch?.color}
                  image={value.swatch?.image?.previewImage?.url}
                  name={value.name}
                  onClick={() => handleColorSwatchClick(value.name)}
                  isSelected={isSelected}
                />
              );
            })}
          </div>
        )}
      </div>
    </Link>
  );
}
