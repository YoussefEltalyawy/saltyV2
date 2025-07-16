import { Link } from 'react-router';
import { Image, Money } from '@shopify/hydrogen';
import type { ProductItemFragment } from 'storefrontapi.generated';

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

export function ProductCard({ product }: { product: ProductItemFragment }) {
  const image = product.featuredImage;
  // Find color option
  const colorOption = product.options?.find(opt => opt.name.toLowerCase() === 'color');
  return (
    <Link
      className="block bg-white transition-shadow group"
      to={`/products/${product.handle}`}
      prefetch="intent"
    >
      {image && (
        <Image
          alt={image.altText || product.title}
          aspectRatio="3/4"
          data={image}
          loading="lazy"
          sizes="(min-width: 45em) 400px, 100vw"
          className="w-full h-auto rounded-md mb-2 object-cover"
        />
      )}
      <div className="flex flex-col gap-1 ml-2">
        <h4 className="text-sm font-medium text-gray-900 group-hover:underline truncate">{product.title}</h4>
        <span className="text-xs text-gray-700 font-semibold">
          <Money data={product.priceRange.minVariantPrice} />
        </span>
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