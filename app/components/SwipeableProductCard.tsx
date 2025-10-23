import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router';
import { Image, Money } from '@shopify/hydrogen';
import type { ProductItemFullFragment } from 'storefrontapi.generated';
import { ProductPrice } from './ProductPrice';

function ColorSwatch({ color, image, name }: { color?: string; image?: string; name: string }) {
  return (
    <div
      aria-label={name}
      className="w-4 h-4 rounded- border border-gray-300 mr-1 inline-block align-middle overflow-hidden"
      style={{ backgroundColor: color || 'transparent' }}
      title={name}
    >
      {image && <img src={image} alt={name} className="w-full h-full object-cover" />}
    </div>
  );
}

interface SwipeableProductCardProps {
  product: ProductItemFullFragment;
}

export function SwipeableProductCard({ product }: SwipeableProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(1); // Start at 1 because we add a duplicate at the beginning
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get all images (featured image + additional images)
  const allImages = product.images?.nodes || [];
  const featuredImage = product.featuredImage;

  // Combine featured image with other images, ensuring no duplicates
  const originalImages = [
    featuredImage,
    ...allImages.filter(img => img.id !== featuredImage?.id)
  ].filter(Boolean);

  // Create infinite carousel by duplicating first and last images
  const images = originalImages.length > 1 ? [
    originalImages[originalImages.length - 1], // Last image at the beginning
    ...originalImages,
    originalImages[0] // First image at the end
  ] : originalImages;

  // Find color option
  const colorOption = product.options?.find((opt: ProductItemFullFragment['options'][number]) => opt.name.toLowerCase() === 'color');

  // Handle infinite loop transitions
  const handleInfiniteTransition = (newIndex: number) => {
    if (originalImages.length <= 1) return;

    setIsTransitioning(true);
    setCurrentImageIndex(newIndex);

    // After transition completes, jump to the real position without animation
    setTimeout(() => {
      if (newIndex === 0) {
        // If we're at the duplicate last image, jump to the real last image
        setCurrentImageIndex(originalImages.length);
      } else if (newIndex === images.length - 1) {
        // If we're at the duplicate first image, jump to the real first image
        setCurrentImageIndex(1);
      }
      setIsTransitioning(false);
    }, 300);
  };

  // Handle touch/mouse events for swiping
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
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // Swipe right - previous image
        const newIndex = currentImageIndex - 1;
        handleInfiniteTransition(newIndex);
      } else {
        // Swipe left - next image
        const newIndex = currentImageIndex + 1;
        handleInfiniteTransition(newIndex);
      }
    }

    setIsDragging(false);
    setTranslateX(0);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Mouse events (for desktop)
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

  // Add global mouse events when dragging
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
        style={{ cursor: images.length > 1 ? 'grab' : 'pointer' }}
      >
        <div
          className={`flex ${isTransitioning ? 'transition-transform duration-300 ease-out' : ''}`}
          style={{
            transform: `translateX(${-currentImageIndex * 100 + (isDragging ? (translateX / (containerRef.current?.offsetWidth || 1)) * 100 : 0)}%)`,
          }}
        >
          {images.map((image, index) => (
            <div key={image?.id || index} className="w-full flex-shrink-0">
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
        <h4 className="text-sm text-gray-900 group-hover:underline truncate">{product.title}</h4>
        <p className='text-[13px]'>
          {product.selectedOrFirstAvailableVariant ? (
            <ProductPrice
              price={product.selectedOrFirstAvailableVariant.price}
              compareAtPrice={product.selectedOrFirstAvailableVariant.compareAtPrice}
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
            {colorOption.optionValues.map((value: any) => (
              <ColorSwatch
                key={value.name}
                color={value.swatch?.color}
                image={value.swatch?.image?.previewImage?.url}
                name={value.name}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
