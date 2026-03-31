import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {
  ProductItemFullFragment as ProductItemFragment,
  CollectionItemFragment,
  RecommendedProductFragment,
} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';

export function ProductItem({
  product,
  loading,
}: {
  product:
    | CollectionItemFragment
    | ProductItemFragment
    | RecommendedProductFragment;
  loading?: 'eager' | 'lazy';
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  const isLimited = (product as any).tags?.some?.((tag: string) => tag.toUpperCase() === 'LIMITED');

  return (
    <Link
      className="product-item relative block"
      key={product.id}
      prefetch="intent"
      to={variantUrl}
    >
      {isLimited && (
        <div className="absolute top-2 left-2 z-10 bg-black/90 text-white text-[10px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 backdrop-blur-sm pointer-events-none">
          LIMITED
        </div>
      )}
      {image && (
        <Image
          alt={image.altText || product.title}
          aspectRatio="1/1"
          data={image}
          loading={loading}
          sizes="(min-width: 45em) 400px, 100vw"
        />
      )}
      <h4>{product.title}</h4>
      <small>
        <Money data={product.priceRange.minVariantPrice} />
      </small>
    </Link>
  );
}
