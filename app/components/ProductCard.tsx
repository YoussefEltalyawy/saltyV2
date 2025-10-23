import type { ProductItemFullFragment } from 'storefrontapi.generated';
import { SwipeableProductCard } from './SwipeableProductCard';

export function ProductCard({ product }: { product: ProductItemFullFragment }) {
  return <SwipeableProductCard product={product} />;
} 